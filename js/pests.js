/* Pests: Skitter (eats crystals), Dropper (seeds crystals), Venom drone (poisons crystals), Thief (steals power-ups). */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, F = G.field;
  const W = C.W, H = C.H;
  const P = {};
  G.pests = P;
  let uid = 1000;

  const T = {
    skitter: { r: 14, hp: 2, spr: 'skitter', hue: 315, size: 1.3 },
    dropper: { r: 13, hp: 2, spr: 'dropper', hue: 35, size: 1.1 },
    venom: { r: 16, hp: 1, spr: 'venom', hue: 275, size: 1.3 },
    thief: { r: 15, hp: 8, spr: 'thief', hue: 50, size: 1.8, scale: 0.72 },
  };
  P.TYPES = T;

  function make(g, type, x, y) {
    const hp = T[type].hp + (type === 'thief' ? Math.floor(g.stage / 6) : 0);
    return { id: ++uid, type, x, y, vx: 0, vy: 0, r: T[type].r, hp, maxHp: hp, t: 0, anim: Math.random() * 5, flash: 0, dead: false, zt: 0, lastRow: -9, loot: null, state: 'go', dir: 1 };
  }

  P.reset = function (g) {
    g.pests = [];
    g.pestT = { skitter: 6, dropper: 5, venom: 12 };
  };

  P.spawn = function (g, type) {
    const n = g.stage;
    if (type === 'skitter') {
      const left = Math.random() < 0.5, p = make(g, type, left ? -24 : W + 24, U.rand(C.ZONE_Y0 - 60, H - 60));
      p.dir = left ? 1 : -1; p.vx = p.dir * (115 + n * 4); p.vy = U.chance(0.5) ? 110 : -110; p.zt = U.rand(0.3, 0.8);
      g.pests.push(p);
    } else if (type === 'dropper') {
      const p = make(g, type, F.cx(U.randInt(1, C.COLS - 2)), C.GY - 14);
      p.vy = 125 + n * 3;
      g.pests.push(p);
    } else if (type === 'venom') {
      const left = Math.random() < 0.5, row = U.randInt(2, C.ZONE_TOP - 1), p = make(g, type, left ? -30 : W + 30, F.cy(row));
      p.dir = left ? 1 : -1; p.vx = p.dir * (88 + n * 2); p.baseY = p.y;
      g.pests.push(p);
    } else {
      const p = make(g, 'thief', U.chance(0.5) ? 70 : W - 70, -30);
      p.vy = 95 + n * 2; p.state = 'hunt';
      g.pests.push(p);
      A.sfx.thief(); FX.text(p.x, 100, 'THIEF!', '#ffd24a', 22);
    }
  };

  function update1(g, p, dt) {
    p.t += dt; p.anim += dt;
    if (p.flash > 0) p.flash -= dt;
    switch (p.type) {
      case 'skitter': {
        p.zt -= dt;
        if (p.zt <= 0) { p.vy = (Math.random() < 0.5 ? -1 : 1) * U.rand(90, 175); p.zt = U.rand(0.3, 0.9); }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y < C.ZONE_Y0 - 90) { p.y = C.ZONE_Y0 - 90; p.vy = Math.abs(p.vy); }
        if (p.y > H - 36) { p.y = H - 36; p.vy = -Math.abs(p.vy); }
        const c = F.col(p.x), r = F.row(p.y);
        if (F.get(c, r)) { F.eat(c, r); A.sfx.crystalHit(); }
        if ((p.dir > 0 && p.x > W + 40) || (p.dir < 0 && p.x < -40)) p.dead = true;
        break;
      }
      case 'dropper': {
        p.y += p.vy * dt;
        const r = F.row(p.y), c = F.col(p.x);
        if (r !== p.lastRow) {
          p.lastRow = r;
          if (r >= 1 && r <= C.ROWS - 4 && !F.get(c, r) && Math.random() < 0.4) { F.add(c, r); FX.sparks(p.x, p.y, 4, 80, 'hsla(35,100%,65%,1)', 0.3); }
        }
        if (p.y > H + 30) p.dead = true;
        break;
      }
      case 'venom': {
        p.x += p.vx * dt; p.y = p.baseY + Math.sin(p.t * 4) * 6;
        const c = F.col(p.x), r = F.row(p.y), k = F.get(c, r);
        if (k && !k.poison) { k.poison = true; A.sfx.poison(); FX.sparks(p.x, p.y, 5, 90, 'hsla(110,100%,65%,1)', 0.35); }
        if ((p.dir > 0 && p.x > W + 50) || (p.dir < 0 && p.x < -50)) p.dead = true;
        break;
      }
      default: { // thief
        const pl = g.player;
        if (p.state === 'hunt') {
          const tx = pl.alive ? pl.x : W / 2;
          p.x += U.clamp(tx - p.x, -1, 1) * 150 * dt + Math.sin(p.t * 3) * 70 * dt;
          p.y += p.vy * dt;
          if (p.y > H + 40) p.dead = true;
        } else {
          p.y -= 300 * dt; p.x += Math.sin(p.t * 6) * 150 * dt;
          if (p.y < -60) { p.dead = true; if (p.loot) FX.text(W / 2, 100, 'LOOT LOST', '#ff8a8a', 20); }
        }
      }
    }
  }

  P.update = function (g, dt) {
    for (const p of g.pests) update1(g, p, dt);
    for (let i = g.pests.length - 1; i >= 0; i--) if (g.pests[i].dead) { g.pests[i] = g.pests[g.pests.length - 1]; g.pests.pop(); }
    if (g.state !== 'play' || g.over) return;
    const n = g.stage, t = g.pestT;
    const count = (type) => g.pests.filter((p) => p.type === type).length;
    t.skitter -= dt; t.dropper -= dt; if (n >= 2) t.venom -= dt;
    if (t.skitter <= 0) { t.skitter = U.rand(9, 15) / (1 + 0.06 * n); if (count('skitter') < Math.min(3, 1 + Math.floor(n / 5))) P.spawn(g, 'skitter'); }
    if (t.dropper <= 0) { t.dropper = (F.count < 20 ? U.rand(4, 7) : U.rand(11, 17)) / (1 + 0.05 * n); if (count('dropper') < Math.min(3, 1 + Math.floor(n / 4))) P.spawn(g, 'dropper'); }
    if (n >= 2 && t.venom <= 0) { t.venom = U.rand(14, 22) / (1 + 0.05 * n); if (count('venom') < Math.min(3, 1 + Math.floor(n / 6))) P.spawn(g, 'venom'); }
    if (g.thiefAt > 0 && g.stageTime > g.thiefAt) { g.thiefAt = 0; P.spawn(g, 'thief'); }
  };

  P.kill = function (g, p, o) {
    if (p.dead) return;
    p.dead = true;
    let base = { dropper: 200, venom: 1000, thief: 1000 }[p.type];
    if (p.type === 'skitter') { const d = Math.hypot(p.x - g.player.x, p.y - g.player.y); base = d < 90 ? 900 : d < 180 ? 600 : 300; }
    if (!o || !o.silent) { g.award(base, p.x, p.y); g.comboKill(); }
    FX.explosion(p.x, p.y, T[p.type].size, T[p.type].hue);
    A.sfx.kill(1);
    if (p.type === 'thief') {
      if (p.loot) { g.dropPickup(p.x, p.y, p.loot); A.sfx.recovered(); FX.text(p.x, p.y - 30, 'RECOVERED!', '#7dffd8', 20); g.addScore(1000); }
      else g.dropPickup(p.x, p.y);
    } else if (p.type === 'skitter' && !g.demo && Math.random() < 0.18) g.dropPickup(p.x, p.y);
  };

  P.damage = function (g, p, dmg) {
    if (p.dead) return;
    p.hp -= dmg; p.flash = 0.07;
    if (p.type === 'dropper' && p.hp > 0) p.vy *= 1.5;
    if (p.hp <= 0) P.kill(g, p);
    else { A.sfx.hit(); FX.sparks(p.x, p.y, 3, 120, 'hsla(40,100%,70%,1)', 0.25, 1.4); }
  };

  P.thiefTouch = function (g, p) {
    if (p.state !== 'hunt') return;
    const pl = g.player;
    let loot = null;
    if (pl.shield > 0) { loot = 'S'; pl.shield = 0; }
    else if (pl.drones > 0) { loot = 'D'; pl.drones--; }
    else if (pl.tier > 1) { loot = 'W'; pl.tier--; }
    else if (pl.bombs > 0) { loot = 'B'; pl.bombs--; }
    p.state = 'flee'; p.t = 0; p.loot = loot;
    A.sfx.stolen(); pl.hitFlash = 0.3;
    if (loot) FX.text(p.x, p.y - 28, 'STOLEN!', '#ff6a6a', 22);
    else if (!g.demo) { g.score = Math.max(0, g.score - 1000); FX.text(p.x, p.y - 28, '-1000', '#ff6a6a', 22); }
    FX.ring(p.x, p.y, 10, 60, 'hsla(50,100%,65%,1)', 0.4, 3);
  };

  P.draw = function (ctx, g) {
    const sp = GFX.spr;
    for (const p of g.pests) {
      const T1 = T[p.type], frames = sp[T1.spr], idx = frames.length > 1 ? Math.floor(p.anim * 10) % 2 : 0;
      const img = p.flash > 0 ? GFX.flash[T1.spr][idx] : frames[idx];
      const sc = T1.scale || 1;
      if (p.loot) {
        ctx.globalCompositeOperation = 'lighter';
        GFX.drawGlow(ctx, 'hsla(185,100%,60%,1)', p.x, p.y, 28 + Math.sin(p.anim * 8) * 4, 0.6);
        ctx.globalCompositeOperation = 'source-over';
        GFX.draw(ctx, sp.pick[p.loot], p.x, p.y - 28, 0, 0.6 + 0.2 * Math.abs(Math.cos(p.anim * 3)), 0.7);
      }
      if (p.type === 'venom') GFX.draw(ctx, img, p.x, p.y, 0, p.dir * sc, sc);
      else if (p.type === 'thief') GFX.draw(ctx, img, p.x, p.y, Math.sin(p.t * 3) * 0.2, sc, sc);
      else GFX.draw(ctx, img, p.x, p.y, 0, sc, sc);
    }
  };
})((window.SGS = window.SGS || {}));
