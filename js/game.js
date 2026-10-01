/* Core game state: player, bullets, collisions, level flow. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, F = G.field, Ch = G.chain, P = G.pests, TAU = U.TAU;
  const W = C.W, H = C.H;
  const Game = { state: 'title', demo: true, time: 0 };
  G.game = Game;

  const SPAWN = { x: W / 2, y: H - 44 };
  function newPlayer() {
    return { x: SPAWN.x, y: SPAWN.y, alive: true, tier: 1, drones: 0, shield: 0, bombs: 1, fireCd: 0, invuln: 2, respawn: 0, tilt: 0, t: 0, dx: [-26, 26], dy: [6, 6], bombCd: 0, hitFlash: 0, muzzle: 0 };
  }

  Game.reset = function (demo, startStage) {
    this.demo = !!demo;
    this.score = 0; this.lives = C.START_LIVES; this.stage = 0;
    this.combo = 0; this.comboT = 0; this.mult = 1;
    this.lifeIdx = 0; this.nextLifeAt = C.EXTRA_LIFE_AT[0];
    this.pb = []; this.eb = []; this.pk = []; this.maxEB = 40;
    this.boss = null; this.banner = null;
    this.stageTime = 0; this.perfect = true; this.timer = 0; this.over = false; this.overDone = false;
    this.thiefAt = 0; this.repair = null; this.world = 0; this.chainSpeed = 6;
    this.player = newPlayer();
    this.hi = G.scores.best();
    FX.reset(); F.reset(); F.fill(26); Ch.reset(this); P.reset(this);
    this.startStage(startStage || 1);
  };

  /* ---------- scoring ---------- */
  Game.addScore = function (v) {
    this.score += v;
    if (this.demo) return;
    while (this.score >= this.nextLifeAt) {
      this.lives = Math.min(9, this.lives + 1);
      this.lifeIdx++;
      this.nextLifeAt = this.lifeIdx < C.EXTRA_LIFE_AT.length ? C.EXTRA_LIFE_AT[this.lifeIdx] : this.nextLifeAt + C.EXTRA_LIFE_EVERY;
      A.sfx.extraLife();
      this.banner = { text: 'EXTRA SHIP', sub: '', t: 0, life: 1.6, small: true };
    }
  };
  Game.award = function (base, x, y) {
    const v = Math.round(base * this.mult);
    this.addScore(v);
    if (x !== undefined && base >= 100) FX.text(x, y - 16, '+' + U.fmt(v), this.mult > 1 ? '#ffd24a' : '#ffffff', base >= 1000 ? 22 : 14);
  };
  Game.comboKill = function () {
    this.combo++; this.comboT = 2.4;
    const m = Math.min(8, 1 + Math.floor(this.combo / 8));
    if (m > this.mult) {
      this.mult = m;
      FX.text(this.player.x, this.player.y - 40, 'COMBO x' + m, '#ffd24a', 22);
      A.sfx.combo(m);
    }
  };
  Game.breakCombo = function () { this.combo = 0; this.comboT = 0; this.mult = 1; };

  /* ---------- bullets ---------- */
  Game.ebullet = function (x, y, vx, vy, kind, r) {
    if (this.eb.length > this.maxEB) return;
    this.eb.push({ x, y, vx, vy, kind: kind || 'orb', r: r || 5, dead: false });
  };
  Game.clearEnemyBullets = function (fxOn) {
    if (fxOn) for (const b of this.eb) FX.sparks(b.x, b.y, 2, 80, 'hsla(30,100%,60%,1)', 0.3, 1.2);
    this.eb.length = 0;
  };
  Game.pbullet = function (x, y, ang, speed, dmg, kind, pierce) {
    this.pb.push({ x, y, vx: Math.sin(ang) * speed, vy: -Math.cos(ang) * speed, ang, dmg, kind, pierce: !!pierce, hit: pierce ? [] : null, r: kind === 'lance' ? 4 : 3.2, dead: false });
  };

  /* ---------- pickups ---------- */
  Game.dropPickup = function (x, y, kind) {
    this.pk.push({ x, y, kind: kind || this.randomKind(), t: 0, vy: 60, dead: false });
  };
  Game.randomKind = function () {
    const p = this.player;
    const w = { W: p.tier >= C.MAX_TIER ? 1 : 4, D: p.drones >= C.MAX_DRONES ? 1 : 2.4, S: 2, B: p.bombs >= C.MAX_BOMBS ? 0.8 : 2 };
    let tot = 0; for (const k in w) tot += w[k];
    let r = Math.random() * tot;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'W';
  };
  Game.collect = function (pk) {
    const p = this.player, x = pk.x, y = pk.y;
    FX.sparks(x, y, 12, 170, FX.col(50), 0.5);
    FX.ring(x, y, 6, 36, 'hsla(50,100%,70%,1)', 0.35, 2);
    if (pk.kind === 'W') {
      if (p.tier < C.MAX_TIER) { p.tier++; A.sfx.weaponUp(); FX.text(p.x, p.y - 34, p.tier === C.MAX_TIER ? 'PIERCING LANCES!' : 'WEAPON UP', '#ffe27a', 18); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (pk.kind === 'D') {
      if (p.drones < C.MAX_DRONES) { p.drones++; A.sfx.drone(); FX.text(p.x, p.y - 34, 'WINGMAN', '#7dffb8', 18); }
      else { this.award(1000, x, y); A.sfx.pickup(); }
    } else if (pk.kind === 'S') {
      p.shield = C.SHIELD_TIME; A.sfx.shield(); FX.text(p.x, p.y - 34, 'SHIELD', '#8fd4ff', 18);
    } else if (p.bombs < C.MAX_BOMBS) { p.bombs++; A.sfx.bombPickup(); FX.text(p.x, p.y - 34, 'SMART BOMB', '#ff8ca0', 18); }
    else { this.award(1000, x, y); A.sfx.pickup(); }
    this.addScore(200);
  };

  /* ---------- player ---------- */
  const RATE = [0, 7.5, 8, 8.5, 10];
  Game.firePlayer = function (p) {
    const sp = 960, y = p.y - 16;
    if (p.tier === 1) this.pbullet(p.x, y, 0, sp, 1, 'bolt');
    else if (p.tier === 2) { this.pbullet(p.x - 5, y + 2, 0, sp, 1, 'bolt'); this.pbullet(p.x + 5, y + 2, 0, sp, 1, 'bolt'); }
    else if (p.tier === 3) {
      this.pbullet(p.x, y, 0, sp, 1, 'bolt');
      this.pbullet(p.x - 5, y + 3, -0.17, sp, 1, 'bolt');
      this.pbullet(p.x + 5, y + 3, 0.17, sp, 1, 'bolt');
    } else {
      this.pbullet(p.x - 4, y, 0, 1150, 1.5, 'lance', true);
      this.pbullet(p.x + 4, y, 0, 1150, 1.5, 'lance', true);
      this.pbullet(p.x - 10, y + 4, -0.2, sp, 1, 'bolt');
      this.pbullet(p.x + 10, y + 4, 0.2, sp, 1, 'bolt');
    }
    p.fireCd = 1 / RATE[p.tier];
    p.muzzle = 0.06;
    A.sfx.shoot(p.tier);
  };

  Game.useBomb = function () {
    const p = this.player;
    if (!p.alive || p.bombs <= 0 || p.bombCd > 0) return;
    p.bombs--; p.bombCd = 0.8;
    p.invuln = Math.max(p.invuln, 0.9);
    A.sfx.bomb();
    FX.doFlash(0.9, '255,240,220');
    FX.addShake(14);
    FX.ring(p.x, p.y, 10, 760, 'hsla(40,100%,70%,1)', 0.8, 7);
    FX.ring(p.x, p.y, 6, 540, 'hsla(200,100%,75%,1)', 1.0, 4);
    this.clearEnemyBullets(true);
    Ch.killAll(this, { noCrystal: true });
    for (const q of this.pests.slice()) G.pests.kill(this, q);
    if (this.boss && this.boss.state === 'fight') G.boss.bombed(this, this.boss);
  };

  Game.hitPlayer = function () {
    const p = this.player;
    if (!p.alive || p.invuln > 0) return false;
    if (G.debug && G.debug.god) return false;
    if (p.shield > 0) {
      p.shield = 0; p.invuln = 1.2; p.hitFlash = 0.25;
      A.sfx.shieldBreak(); FX.addShake(4);
      FX.ring(p.x, p.y, 12, 60, 'hsla(200,100%,70%,1)', 0.4, 4);
      FX.sparks(p.x, p.y, 16, 220, FX.col(200), 0.5);
      return true;
    }
    p.alive = false;
    FX.explosion(p.x, p.y, 2.6, 190);
    FX.explosion(p.x, p.y, 1.8, 320);
    A.sfx.playerDie(); FX.doFlash(0.5, '255,190,190'); FX.addShake(10);
    p.tier = Math.max(1, p.tier - 1);
    p.drones = Math.max(0, p.drones - 1);
    p.shield = 0;
    this.lives--; this.perfect = false; this.breakCombo();
    if (this.lives <= 0) { this.over = true; this.overT = 2.4; A.music('off'); setTimeout(() => A.sfx.gameOver(), 700); }
    else p.respawn = 1.5;
    return true;
  };

  function pushOut(p) {
    const pr = 7, cr = 12.5;
    const c0 = F.col(p.x), r0 = F.row(p.y);
    for (let it = 0; it < 2; it++) {
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        for (let r = r0 - 1; r <= r0 + 1; r++) {
          if (!F.get(c, r)) continue;
          const dx = p.x - F.cx(c), dy = p.y - F.cy(r), d = Math.hypot(dx, dy), m = pr + cr;
          if (d < m) { const nx = d > 0.01 ? dx / d : 0, ny = d > 0.01 ? dy / d : 1; p.x += nx * (m - d); p.y += ny * (m - d); }
        }
      }
    }
  }

  Game.updatePlayer = function (dt) {
    const p = this.player;
    p.t += dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    if (p.muzzle > 0) p.muzzle -= dt;
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0 && this.lives > 0 && !this.over) {
        p.alive = true; p.x = SPAWN.x; p.y = SPAWN.y; p.invuln = 2.6; p.fireCd = 0; p.tilt = 0;
        F.clearAround(p.x, p.y, 46);
        FX.ring(p.x, p.y, 8, 50, 'hsla(190,100%,70%,1)', 0.5, 3);
      }
      return;
    }
    let mx = 0, my = 0, tx = null, ty = null, fire = false, bomb = false;
    if (this.demo) { const c = this.autopilot(dt); tx = c.x; ty = c.y; fire = true; bomb = c.bomb; }
    else {
      mx = (I.right ? 1 : 0) - (I.left ? 1 : 0); my = (I.down ? 1 : 0) - (I.up ? 1 : 0);
      if (!mx && !my && I.mouseActive) { tx = I.mouseX; ty = I.mouseY; }
      fire = I.fire; bomb = I.takeBomb();
    }
    let vx = 0;
    if (mx || my) {
      const l = Math.hypot(mx, my);
      p.x += mx / l * C.PLAYER_SPEED * dt; p.y += my / l * C.PLAYER_SPEED * dt; vx = mx / l * C.PLAYER_SPEED;
    } else if (tx !== null) {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), step = (this.demo ? C.PLAYER_SPEED : C.MOUSE_SPEED) * dt;
      if (d <= step) { p.x = tx; p.y = ty; vx = dx / dt; } else { p.x += dx / d * step; p.y += dy / d * step; vx = dx / d * C.MOUSE_SPEED; }
    }
    p.x = U.clamp(p.x, 16, W - 16); p.y = U.clamp(p.y, C.ZONE_Y0 + 8, H - 16);
    pushOut(p);
    p.x = U.clamp(p.x, 16, W - 16); p.y = U.clamp(p.y, C.ZONE_Y0 + 8, H - 16);
    p.tilt += (U.clamp(vx / C.PLAYER_SPEED, -1, 1) * 0.3 - p.tilt) * Math.min(1, 14 * dt);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.shield > 0) p.shield -= dt;
    if (p.bombCd > 0) p.bombCd -= dt;
    p.fireCd = Math.max(0, p.fireCd - dt);
    if (fire && p.fireCd <= 0) this.firePlayer(p);
    if (bomb) this.useBomb();
    p.dcd = (p.dcd || 0) - dt;
    p.dpos = p.dpos || [{ x: p.x, y: p.y }, { x: p.x, y: p.y }];
    const k = 1 - Math.exp(-11 * dt);
    for (let i = 0; i < p.drones; i++) {
      const d = p.dpos[i];
      d.x += (p.x + p.dx[i] - d.x) * k; d.y += (p.y + p.dy[i] + Math.sin(p.t * 3 + i * 2) * 2 - d.y) * k;
      if (fire && p.dcd <= 0) this.pbullet(d.x, d.y - 8, 0, 900, 0.8, 'dbolt');
    }
    if (fire && p.dcd <= 0) { p.dcd = 0.22; if (p.drones) A.sfx.droneShot(); }
    if (!S.reduced || Math.random() < 0.4) FX.trail(p.x + U.rand(-2, 2), p.y + 16, 'hsla(190,100%,60%,1)', U.rand(3, 6), 0.14);
  };

  /* attract-mode pilot: dodge the chain and pests, stay low and shoot up */
  Game.autopilot = function (dt) {
    const p = this.player;
    this.apT = (this.apT || 0) - dt;
    if (this.apT <= 0 || !this.apGoal) {
      this.apT = 0.12;
      const threats = [];
      const q = { x: 0, y: 0 };
      for (const ch of this.chains) for (let i = 0; i < ch.segs.length; i++) { Ch.segPos(ch, ch.segs[i], q); if (q.y > C.ZONE_Y0 - 70) threats.push({ x: q.x, y: q.y, r: 62 }); }
      for (const e of this.pests) if (e.type !== 'thief') threats.push({ x: e.x, y: e.y, r: 70 });
      let target = null, bd = 1e9;
      for (const ch of this.chains) for (const s of ch.segs) { Ch.segPos(ch, s, q); if (q.y < p.y - 30) { const d = Math.abs(q.x - p.x); if (d < bd) { bd = d; target = q.x; } } }
      if (this.boss && this.boss.state === 'fight') { const pl = this.boss.plates.find((s) => s.alive); target = pl ? pl.x : this.boss.head.x; }
      let best = { x: p.x, y: p.y }, bc = 1e9;
      for (let cx = 24; cx <= W - 24; cx += 22) {
        for (let cy = C.ZONE_Y0 + 14; cy <= H - 20; cy += 22) {
          let cost = Math.hypot(cx - p.x, cy - p.y) * 0.02 + (H - 50 - cy) * 0.012 + (target === null ? 0 : Math.abs(cx - target) * 0.03);
          for (const t of threats) { const d = Math.hypot(cx - t.x, cy - t.y); if (d < t.r) cost += (t.r - d) * 2.2; }
          for (const b of this.eb) { if (b.y < cy - 200 || b.y > cy + 10) continue; const t = Math.max(0, (cy - b.y) / Math.max(40, b.vy)); if (Math.abs(b.x + b.vx * t - cx) < 26) cost += 40; }
          if (F.get(F.col(cx), F.row(cy))) cost += 400;
          if (cost < bc) { bc = cost; best = { x: cx, y: cy }; }
        }
      }
      this.apGoal = best;
    }
    return { x: this.apGoal.x, y: this.apGoal.y, bomb: this.eb.length > 12 && p.bombs > 0 && Math.random() < 0.05 };
  };

  /* ---------- collisions ---------- */
  Game.collide = function () {
    const p = this.player, boss = this.boss && this.boss.state === 'fight' ? this.boss : null;
    for (const b of this.pb) {
      if (b.dead) continue;
      const h = Ch.hitTest(b.x, b.y, b.r, b.pierce ? b.hit : null);
      if (h) {
        if (b.pierce) b.hit.push(h.s.id);
        Ch.damage(this, h.ch, h.i, b.dmg);
        if (!b.pierce) { b.dead = true; continue; }
      }
      for (const q of this.pests) {
        if (q.dead) continue;
        const rr = q.r + b.r;
        if (U.dist2(b.x, b.y, q.x, q.y) < rr * rr) {
          if (b.pierce) { if (b.hit.indexOf(q.id) >= 0) continue; b.hit.push(q.id); }
          G.pests.damage(this, q, b.dmg);
          if (!b.pierce) { b.dead = true; break; }
        }
      }
      if (b.dead) continue;
      const c0 = F.col(b.x), r0 = F.row(b.y);
      for (let c = c0 - 1; c <= c0 + 1 && !b.dead; c++) {
        for (let r = r0 - 1; r <= r0 + 1; r++) {
          if (!F.get(c, r)) continue;
          const rr = 12.5 + b.r;
          if (U.dist2(b.x, b.y, F.cx(c), F.cy(r)) < rr * rr) {
            const id = 'c' + c + '_' + r;
            if (b.pierce) { if (b.hit.indexOf(id) >= 0) continue; b.hit.push(id); }
            F.hit(this, c, r, b.dmg);
            if (!b.pierce) { b.dead = true; break; }
          }
        }
      }
      if (!b.dead && boss) G.boss.bulletHit(this, boss, b);
    }
    if (!p.alive) return;
    const pr = 7, q = { x: 0, y: 0 };
    for (const b of this.eb) {
      const rr = b.r + pr;
      if (!b.dead && U.dist2(b.x, b.y, p.x, p.y) < rr * rr) { b.dead = true; this.hitPlayer(); if (!p.alive) return; }
    }
    for (const ch of this.chains) {
      for (let i = 0; i < ch.segs.length; i++) {
        Ch.segPos(ch, ch.segs[i], q);
        const rr = (i === 0 ? 14 : 12) + pr - 2;
        if (U.dist2(q.x, q.y, p.x, p.y) < rr * rr) { this.hitPlayer(); if (!p.alive) return; }
      }
    }
    for (const e of this.pests) {
      if (e.dead) continue;
      const rr = e.r + pr;
      if (U.dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        if (e.type === 'thief') G.pests.thiefTouch(this, e);
        else { this.hitPlayer(); if (!p.alive) return; }
      }
    }
    if (boss && G.boss.hitsPlayer(this, boss, p)) this.hitPlayer();
    for (const k of this.pk) {
      if (k.dead) continue;
      if (U.dist2(k.x, k.y, p.x, p.y) < 26 * 26) { k.dead = true; this.collect(k); }
    }
  };

  function step(arr, dt, w, h) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.dead || b.y < -70 || b.y > h + 40 || b.x < -40 || b.x > w + 40) { arr[i] = arr[arr.length - 1]; arr.pop(); }
    }
  }

  Game.update = function (dt) {
    this.time += dt;
    this.stageTime += dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.breakCombo(); }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    this.updatePlayer(dt);
    step(this.pb, dt, W, H);
    Ch.update(this, dt);
    P.update(this, dt);
    if (this.boss) G.boss.update(this, this.boss, dt);
    step(this.eb, dt, W, H);
    for (let i = this.pk.length - 1; i >= 0; i--) {
      const k = this.pk[i];
      k.t += dt; k.y += k.vy * dt;
      if (k.dead || k.y > H + 30) { this.pk[i] = this.pk[this.pk.length - 1]; this.pk.pop(); }
    }
    F.update(dt);
    this.collide();
    FX.update(dt);
    this.flow(dt);
    if (this.over) {
      this.overT -= dt;
      if (this.overT <= 0) {
        if (this.demo) { this.reset(true, U.randInt(1, 4)); this.player.tier = U.randInt(1, 3); this.player.drones = U.randInt(0, 2); }
        else if (!this.overDone) { this.overDone = true; if (this.onOver) this.onOver(); }
      }
    }
  };

  /* ---------- level flow ---------- */
  Game.startStage = function (n) {
    this.stage = n; this.stageTime = 0; this.perfect = true; this.repair = null;
    this.world = Math.floor((n - 1) / C.BOSS_EVERY) % 5;
    this.clearEnemyBullets(false);
    Ch.reset(this); P.reset(this);
    const key = [0, 2, -2, 3, 5][this.world];
    if (n % C.BOSS_EVERY === 0) {
      this.state = 'bossWarn'; this.timer = 3.4;
      this.banner = { text: 'WARNING', sub: 'SERPENT MOTHER APPROACHING', t: 0, life: 3.4, warn: true };
      if (!this.demo) { A.sfx.warning(); A.music('boss', 3, key); }
    } else {
      this.state = 'intro'; this.timer = 1.7;
      this.banner = { text: 'LEVEL ' + n, sub: '', t: 0, life: 1.7 };
      if (!this.demo) A.music('play', n >= 3 ? 2 : 1, key);
    }
    G.onStage && G.onStage(n);
  };

  Game.beginClear = function (boss) {
    this.state = 'clear';
    this.timer = boss ? 2.2 : 1.2;
    this.clearEnemyBullets(true);
    for (const ch of this.chains.slice()) if (ch.harasser) Ch.killAll(this, { silent: true, noCrystal: true });
    for (const q of this.pests.slice()) G.pests.kill(this, q, { silent: true });
    let bonus = 0;
    if (this.perfect && !this.demo) bonus = boss ? 5000 : 1000 + this.stage * 100;
    if (bonus) { this.addScore(bonus); A.sfx.perfect(); }
    if (!this.demo) A.sfx.stageClear();
    this.banner = { text: boss ? 'SERPENT MOTHER DESTROYED' : 'LEVEL ' + this.stage + ' CLEAR', sub: bonus ? 'PERFECT  +' + U.fmt(bonus) : '', t: 0, life: 3 };
  };

  Game.flow = function (dt) {
    if (this.over) return;
    switch (this.state) {
      case 'intro':
        this.timer -= dt;
        if (this.timer <= 0) {
          Ch.spawnWave(this, this.stage);
          this.thiefAt = this.stage >= 3 && Math.random() < 0.5 ? U.rand(9, 18) : 0;
          this.state = 'play';
        }
        break;
      case 'play':
        if (Ch.requiredLeft(this) === 0) this.beginClear(false);
        break;
      case 'bossWarn':
        this.timer -= dt;
        if (this.timer <= 0) { this.boss = G.boss.create(this, this.stage); this.state = 'bossFight'; }
        break;
      case 'bossFight':
        if (this.boss && this.boss.state === 'done') { this.boss = null; this.beginClear(true); }
        break;
      case 'clear': {
        this.timer -= dt;
        if (this.timer > 0) break;
        if (!this.repair) { const q = F.damaged(); q.sort((a, b) => a.r - b.r || a.c - b.c); this.repair = { q, t: 0, end: 1.0, n: 0 }; }
        const R = this.repair;
        R.t -= dt;
        while (R.t <= 0 && R.q.length) {
          const k = R.q.shift();
          if (F.get(k.c, k.r) === k) { F.repair(k); R.n++; if (!this.demo) { this.addScore(5); A.sfx.repair(R.n); } }
          R.t += this.demo ? 0.02 : 0.07;
        }
        if (!R.q.length) { R.end -= dt; if (R.end <= 0) this.startStage(this.stage + 1); }
        break;
      }
      default:
    }
  };

  /* ---------- rendering (logical 540x720 space) ---------- */
  Game.drawPlayer = function (ctx) {
    const p = this.player, spr = GFX.spr, SS = C.SHIP_SCALE;
    if (!p.alive) return;
    const blink = p.invuln > 0 ? (Math.floor(p.t * 16) % 2 ? 0.35 : 0.85) : 1;
    ctx.globalCompositeOperation = 'lighter';
    const fl = (16 + Math.random() * 8 + (I.fire ? 4 : 0)) * SS * 1.3;
    for (const sx of [-14 * SS, 14 * SS]) {
      const g = ctx.createLinearGradient(0, p.y + 33 * SS, 0, p.y + 33 * SS + fl);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.3, 'rgba(70,225,255,0.8)'); g.addColorStop(1, 'rgba(40,80,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(p.x + sx - 2 + p.tilt * 4, p.y + 32 * SS); ctx.lineTo(p.x + sx + 2 + p.tilt * 4, p.y + 32 * SS); ctx.lineTo(p.x + sx + p.tilt * 10, p.y + 33 * SS + fl); ctx.closePath(); ctx.fill();
    }
    if (p.muzzle > 0) GFX.drawGlow(ctx, 'hsla(190,100%,65%,1)', p.x, p.y - 20, 14, 0.9);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < p.drones; i++) {
      const d = p.dpos[i];
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(150,100%,60%,1)', d.x, d.y + 6, 6, 0.8);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.drone, d.x, d.y, p.tilt * 0.6, 0.55, 0.55, blink);
    }
    GFX.draw(ctx, spr.player, p.x, p.y, p.tilt * 0.4, SS, SS, blink);
    ctx.globalCompositeOperation = 'lighter';
    GFX.drawGlow(ctx, 'hsla(190,100%,70%,1)', p.x, p.y + 2, 4, 1);
    if (p.shield > 0) {
      const low = p.shield < 3 && Math.floor(p.t * 8) % 2;
      ctx.globalAlpha = low ? 0.25 : 0.6 + Math.sin(p.t * 6) * 0.15;
      const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 23);
      g.addColorStop(0, 'rgba(80,190,255,0)'); g.addColorStop(0.75, 'rgba(80,190,255,0.25)'); g.addColorStop(1, 'rgba(180,235,255,0.9)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 23, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  Game.drawZone = function (ctx) {
    const y0 = C.ZONE_Y0, t = this.time;
    const g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, 'rgba(55,230,255,0.07)'); g.addColorStop(1, 'rgba(55,230,255,0.015)');
    ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0);
    ctx.strokeStyle = 'rgba(55,230,255,' + (0.3 + 0.1 * Math.sin(t * 3)) + ')'; ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 20;
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
    ctx.setLineDash([]);
  };

  Game.render = function (ctx) {
    const spr = GFX.spr;
    this.drawZone(ctx);
    F.draw(ctx, this.time);
    for (const k of this.pk) {
      const spin = 0.55 + 0.45 * Math.abs(Math.cos(k.t * 3.2));
      ctx.globalCompositeOperation = 'lighter';
      GFX.drawGlow(ctx, 'hsla(' + (k.kind === 'W' ? 45 : k.kind === 'D' ? 150 : k.kind === 'S' ? 205 : 350) + ',100%,60%,1)', k.x, k.y, 26, 0.55 + Math.sin(k.t * 6) * 0.15);
      ctx.globalCompositeOperation = 'source-over';
      GFX.draw(ctx, spr.pick[k.kind], k.x, k.y, 0, spin * 0.8, 0.8);
    }
    Ch.draw(ctx, this);
    if (this.boss) G.boss.draw(ctx, this, this.boss);
    P.draw(ctx, this);
    FX.drawNorm(ctx);
    for (const b of this.eb) {
      if (b.kind === 'needle') GFX.draw(ctx, spr.eneedle, b.x, b.y, Math.atan2(b.vy, b.vx) - Math.PI / 2);
      else if (b.kind === 'big') GFX.draw(ctx, spr.ebig, b.x, b.y, this.time * 4);
      else GFX.draw(ctx, spr.eorb, b.x, b.y, 0);
    }
    for (const b of this.pb) GFX.draw(ctx, spr[b.kind], b.x, b.y, b.ang, 0.8, 0.8);
    this.drawPlayer(ctx);
    ctx.globalCompositeOperation = 'lighter';
    FX.drawAdd(ctx);
    ctx.globalCompositeOperation = 'source-over';
    FX.drawText(ctx);
  };
})((window.SGS = window.SGS || {}));
