/* Serpent Mother bosses: a giant armored chain that weaves across the field. Shoot the plates off,
   then the head's core is exposed. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, F = G.field, Ch = G.chain, TAU = U.TAU;
  const W = C.W, H = C.H;
  const B = {};
  G.boss = B;
  const SP = 40, PS = 0.62, HS = 0.7;
  const DEFS = [
    { name: 'HIVE SERPENT MOTHER', hue: 140, plates: 14, hp: 16, A: 185, w: 0.5, B: 60, gunEvery: 3, atk: 'aim' },
    { name: 'EMBER WYRM', hue: 18, plates: 16, hp: 17, A: 190, w: 0.62, B: 70, gunEvery: 3, atk: 'fan' },
    { name: 'VOID CRAWLER', hue: 285, plates: 16, hp: 17, A: 175, w: 0.55, B: 85, gunEvery: 2, atk: 'ring' },
    { name: 'FROST CHAIN', hue: 195, plates: 18, hp: 18, A: 190, w: 0.6, B: 70, gunEvery: 3, atk: 'fan' },
    { name: 'SOLAR HYDRA', hue: 48, plates: 20, hp: 18, A: 195, w: 0.68, B: 80, gunEvery: 2, atk: 'ring' },
  ];
  B.DEFS = DEFS;
  B.nameFor = function (stage) {
    const k = Math.round(stage / C.BOSS_EVERY) - 1;
    return DEFS[k % DEFS.length].name + (Math.floor(k / DEFS.length) > 0 ? ' MK ' + (Math.floor(k / DEFS.length) + 1) : '');
  };

  B.create = function (g, stage) {
    const k = Math.round(stage / C.BOSS_EVERY) - 1, idx = k % DEFS.length, loop = Math.floor(k / DEFS.length);
    const def = DEFS[idx], hpMul = 1 + 0.5 * loop;
    const plates = [];
    for (let i = 0; i < def.plates; i++) {
      plates.push({ id: 'p' + i, alive: true, hp: Math.ceil(def.hp * hpMul), max: Math.ceil(def.hp * hpMul), gun: i % def.gunEvery === def.gunEvery - 1, flash: 0, cd: U.rand(1.5, 3.8), x: W / 2, y: -200, ang: 0 });
    }
    const hhp = Math.ceil(150 * hpMul);
    const b = {
      def, idx, loop, state: 'enter', t: 0, ft: 0, plates, art: GFX.art.boss(def.hue), name: B.nameFor(stage),
      head: { hp: hhp, max: hhp, flash: 0, x: W / 2, y: -120, ang: 0, cd: 2.5 }, trail: [], D: 0,
      shielded: true, destroyed: 0, seedT: 1.5, spawnT: 12, ringT: 5, sp: 0, spT: 2, sang: 0, shieldFlash: 0, dying: 0, deathFx: 0,
      total: plates.length * Math.ceil(def.hp * hpMul) + hhp, ph: Math.asin(-20 / def.B),
    };
    const need = def.plates * SP + 160;
    for (let d = need; d >= 0; d -= 4) b.trail.push({ x: W / 2, y: -120 - d, d: -d });
    return b;
  };

  function trailAt(b, dist, out) {
    const t = b.trail;
    let j = t.length - 1;
    while (j > 0 && t[j].d > dist) j--;
    const a = t[j], c = t[Math.min(t.length - 1, j + 1)], span = c.d - a.d || 1, k = U.clamp((dist - a.d) / span, 0, 1);
    out.x = U.lerp(a.x, c.x, k); out.y = U.lerp(a.y, c.y, k);
    return out;
  }

  function placeParts(b) {
    const p1 = { x: 0, y: 0 }, p2 = { x: 0, y: 0 };
    b.plates.forEach((pl, i) => {
      const d = b.D - (i + 1) * SP;
      trailAt(b, d, p1); trailAt(b, d + 10, p2);
      pl.x = p1.x; pl.y = p1.y;
      pl.ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) - Math.PI / 2;
    });
  }

  function fire(g, x, y, ang, speed, kind, r) {
    g.ebullet(x, y, Math.cos(ang) * speed, Math.sin(ang) * speed, kind, r);
  }

  B.update = function (g, b, dt) {
    const h = b.head;
    if (b.shieldFlash > 0) b.shieldFlash -= dt;
    if (h.flash > 0) h.flash -= dt;
    for (const pl of b.plates) if (pl.flash > 0) pl.flash -= dt;
    if (b.state === 'dying') { dyingStep(g, b, dt); return; }
    const px = h.x, py = h.y;
    if (b.state === 'enter') {
      b.t += dt;
      const k = Math.min(1, b.t / 3.2);
      h.x = W / 2; h.y = -120 + 290 * U.smooth(k);
      if (k >= 1) { b.state = 'fight'; b.ft = 0; }
    } else {
      b.ft += dt * (1 + 0.04 * b.destroyed + 0.06 * b.loop);
      h.x = W / 2 + b.def.A * Math.sin(b.def.w * b.ft);
      h.y = 190 + b.def.B * Math.sin(b.def.w * 0.7 * b.ft + b.ph);
    }
    const moved = Math.hypot(h.x - px, h.y - py);
    if (moved > 0.0001) {
      b.D += moved;
      const last = b.trail[b.trail.length - 1];
      if (Math.hypot(h.x - last.x, h.y - last.y) >= 3 || b.trail.length < 2) b.trail.push({ x: h.x, y: h.y, d: b.D });
      while (b.trail.length > 4 && b.trail[1].d < b.D - b.plates.length * SP - 120) b.trail.shift();
      h.ang += (Math.atan2(h.y - py, h.x - px) - Math.PI / 2 - h.ang) * 0.2;
    }
    placeParts(b);
    if (b.state !== 'fight') return;
    const loopMul = 1 + 0.12 * b.loop, rate = (1 + 0.08 * b.destroyed) * loopMul * (g.demo ? 0.7 : 1), sp = (175 + 14 * b.loop) * (g.demo ? 0.85 : 1);
    for (const pl of b.plates) {
      if (!pl.alive || !pl.gun || h.y < 40) continue;
      pl.cd -= dt * rate;
      if (pl.cd <= 0) {
        pl.cd = 3.4;
        if (!g.player.alive) continue;
        const a = Math.atan2(g.player.y - pl.y, g.player.x - pl.x);
        if (b.def.atk === 'fan') for (let i = -1; i <= 1; i++) fire(g, pl.x, pl.y, a + i * 0.26, sp, 'needle', 4);
        else fire(g, pl.x, pl.y, a, sp, 'orb', 5);
      }
    }
    headAttack(g, b, dt, rate, sp);
    b.seedT -= dt;
    if (b.seedT <= 0) {
      b.seedT = 1.6;
      const tail = b.plates.filter((q) => q.alive).pop() || { x: h.x, y: h.y };
      const c = F.col(tail.x), r = F.row(tail.y);
      if (r >= 1 && r < C.ZONE_TOP - 1 && F.count < 48 && !F.get(c, r)) { F.add(c, r); FX.sparks(F.cx(c), F.cy(r), 4, 80, FX.col(b.def.hue), 0.3); }
    }
    b.spawnT -= dt;
    if (b.spawnT <= 0) {
      b.spawnT = 14;
      if (g.chains.filter((q) => q.harasser).length < 2) Ch.spawnSolo(g, { harasser: true, row: U.randInt(C.ZONE_TOP, C.ROWS - 1), vdir: U.chance(0.5) ? 1 : -1, hp: 1 });
    }
  };

  function headAttack(g, b, dt, rate, sp) {
    const h = b.head;
    if (b.shielded) {
      h.cd -= dt * rate;
      if (h.cd <= 0 && g.player.alive) {
        h.cd = 3.6;
        const a = Math.atan2(g.player.y - h.y, g.player.x - h.x);
        for (let i = -1; i <= 1; i++) fire(g, h.x, h.y + 10, a + i * 0.3, sp * 1.05, 'needle', 4);
      }
      if (b.def.atk === 'ring') {
        b.ringT -= dt;
        if (b.ringT <= 0) { b.ringT = 6.5; for (let i = 0; i < 12; i++) fire(g, h.x, h.y, i / 12 * TAU, sp * 0.7, 'orb', 5); FX.ring(h.x, h.y, 10, 80, FX.col(b.def.hue), 0.5, 3); }
      }
      return;
    }
    b.spT -= dt;
    if (b.spT > 0) {
      b.sp -= dt;
      if (b.sp <= 0) {
        b.sp = 0.12; b.sang += 0.42;
        for (let q = 0; q < 2; q++) fire(g, h.x, h.y, b.sang + q * Math.PI, sp * 0.85, 'needle', 4);
      }
    } else if (b.spT < -1.5) b.spT = 2.4;
    b.ringT -= dt;
    if (b.ringT <= 0) {
      b.ringT = 5;
      for (let i = 0; i < 16; i++) fire(g, h.x, h.y, i / 16 * TAU, sp * 0.75, 'orb', 5);
      FX.ring(h.x, h.y, 10, 100, 'hsla(0,100%,65%,1)', 0.5, 3);
    }
  }

  function breakPlate(g, b, pl) {
    pl.alive = false; pl.hp = 0;
    FX.explosion(pl.x, pl.y, 2.4, b.def.hue);
    FX.debris(pl.x, pl.y, 10, FX.col(b.def.hue, 55), 220);
    FX.doFlash(0.2, '255,235,210');
    A.sfx.partBreak();
    b.destroyed++;
    g.award(400, pl.x, pl.y);
    g.comboKill();
    const c = F.col(pl.x), r = F.row(pl.y);
    if (r >= 1 && r < C.ROWS - 1 && !F.get(c, r)) F.add(c, r);
    if (Math.random() < 0.22) g.dropPickup(pl.x, pl.y);
    if (b.shielded && !b.plates.some((q) => q.alive)) {
      b.shielded = false;
      FX.text(b.head.x, b.head.y + 70, 'CORE EXPOSED!', '#ff7a7a', 24);
      FX.ring(b.head.x, b.head.y, 20, 170, 'hsla(0,100%,65%,1)', 0.7, 5);
      A.sfx.thief();
    }
  }

  function breakHead(g, b) {
    b.state = 'dying'; b.dying = 0; b.deathFx = 0;
    g.award(5000 * (b.idx + 1) * (b.loop + 1), b.head.x, b.head.y);
    g.comboKill();
    g.clearEnemyBullets(true);
    Ch.killAll(g, { silent: true, noCrystal: true });
    for (const p of g.pests) G.pests.kill(g, p, { silent: true });
    A.sfx.boom();
  }

  function dyingStep(g, b, dt) {
    b.dying += dt; b.deathFx -= dt;
    const h = b.head;
    if (b.deathFx <= 0) {
      b.deathFx = 0.1;
      const p = trailAt(b, b.D - U.rand(0, 5) * SP, { x: 0, y: 0 });
      FX.explosion(U.chance(0.5) ? h.x + U.rand(-30, 30) : p.x, U.chance(0.5) ? h.y + U.rand(-30, 30) : p.y, U.rand(1.5, 2.8), b.def.hue);
      if (Math.random() < 0.3) A.sfx.kill(2);
    }
    if (b.dying > 3.1) {
      FX.explosion(h.x, h.y, 7, b.def.hue);
      FX.ring(h.x, h.y, 20, 520, 'hsla(0,0%,100%,1)', 0.9, 6);
      FX.doFlash(1, '255,255,255'); FX.addShake(16);
      A.sfx.boom();
      for (let i = 0; i < 3; i++) g.dropPickup(h.x + (i - 1) * 60, h.y + 20, i === 0 ? 'W' : undefined);
      b.state = 'done';
    }
  }

  function dmgPlate(g, b, pl, dmg) {
    pl.hp -= dmg; pl.flash = 0.06;
    if (pl.hp <= 0) breakPlate(g, b, pl); else A.sfx.hit();
  }

  B.bulletHit = function (g, b, bu) {
    for (const pl of b.plates) {
      if (!pl.alive) continue;
      const rr = 21 + bu.r;
      if (U.dist2(bu.x, bu.y, pl.x, pl.y) < rr * rr) {
        if (bu.pierce) { if (bu.hit.indexOf(pl.id) >= 0) continue; bu.hit.push(pl.id); }
        FX.sparks(bu.x, bu.y, 3, 140, FX.col(b.def.hue, 75), 0.25, 1.4);
        dmgPlate(g, b, pl, bu.dmg);
        if (!bu.pierce) { bu.dead = true; return; }
      }
    }
    const h = b.head, rr = 33 + bu.r;
    if (U.dist2(bu.x, bu.y, h.x, h.y) < rr * rr) {
      if (b.shielded) {
        if (!bu.pierce) bu.dead = true;
        b.shieldFlash = 0.15; A.sfx.armor();
        FX.sparks(bu.x, bu.y, 3, 160, 'hsla(200,100%,75%,1)', 0.25, 1.4);
        return;
      }
      if (bu.pierce) { if (bu.hit.indexOf('head') >= 0) return; bu.hit.push('head'); }
      h.hp -= bu.dmg; h.flash = 0.06;
      FX.sparks(bu.x, bu.y, 3, 140, 'hsla(0,100%,75%,1)', 0.25, 1.4);
      if (h.hp <= 0) breakHead(g, b); else A.sfx.hit();
      if (!bu.pierce) bu.dead = true;
    }
  };

  B.bombed = function (g, b) {
    for (const pl of b.plates) if (pl.alive) dmgPlate(g, b, pl, 16);
    if (b.state === 'fight') {
      if (b.shielded) b.shieldFlash = 0.4;
      else { b.head.hp -= 40; b.head.flash = 0.1; if (b.head.hp <= 0) breakHead(g, b); }
    }
  };

  B.hitsPlayer = function (g, b, p) {
    if (b.state !== 'fight') return false;
    for (const pl of b.plates) if (pl.alive && U.dist2(pl.x, pl.y, p.x, p.y) < 26 * 26) return true;
    return U.dist2(b.head.x, b.head.y, p.x, p.y) < 36 * 36;
  };

  function hexPath(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = rot + i / 6 * TAU; if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }

  B.draw = function (ctx, g, b) {
    if (b.state === 'done') return;
    const art = b.art, t = g.time, h = b.head;
    for (let i = b.plates.length - 1; i >= 0; i--) {
      const pl = b.plates[i];
      if (!pl.alive) continue;
      const img = pl.flash > 0 ? (pl.gun ? art.gunF : art.plateF) : (pl.gun ? art.gun : art.plate);
      if (pl.gun && pl.cd < 0.5) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(15,100%,60%,1)', pl.x, pl.y, 26, 0.8); ctx.globalCompositeOperation = 'source-over'; }
      GFX.draw(ctx, img, pl.x, pl.y, pl.ang, PS, PS);
      if (pl.hp < pl.max) {
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pl.x, pl.y, 24, 0, TAU); ctx.stroke();
        ctx.strokeStyle = pl.hp / pl.max < 0.35 ? '#ff5a5a' : '#8dffb8'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(pl.x, pl.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * pl.hp / pl.max); ctx.stroke();
      }
    }
    GFX.draw(ctx, h.flash > 0 ? art.headF : art.head, h.x, h.y, h.ang, HS, HS);
    ctx.globalCompositeOperation = 'lighter';
    const cx = h.x - Math.sin(h.ang) * 3, cy = h.y - Math.cos(h.ang) * -3;
    GFX.drawGlow(ctx, b.shielded ? FX.col(b.def.hue, 60) : 'hsla(0,100%,60%,1)', cx, cy, 30 + Math.sin(t * 5) * 4, b.shielded ? 0.45 : 0.9);
    if (b.shielded) {
      ctx.globalAlpha = 0.5 + b.shieldFlash * 4 + Math.sin(t * 5) * 0.08;
      hexPath(ctx, h.x, h.y, 40, t * 0.5);
      ctx.fillStyle = 'rgba(70,170,255,0.22)'; ctx.fill();
      ctx.strokeStyle = 'rgba(160,225,255,0.95)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    if (b.state === 'fight' || b.state === 'enter') {
      const left = b.plates.reduce((s, q) => s + (q.alive ? q.hp : 0), 0) + Math.max(0, h.hp), bw = 300, bx = W / 2 - bw / 2, by = 88;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9);
      ctx.fillStyle = FX.col(b.def.hue, 60); ctx.fillRect(bx, by, bw * left / b.total, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '700 11px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(b.name + (b.shielded ? '  -  SHOOT OFF THE ARMOR PLATES' : '  -  DESTROY THE CORE'), W / 2, by - 6);
    }
  };
})((window.SGS = window.SGS || {}));
