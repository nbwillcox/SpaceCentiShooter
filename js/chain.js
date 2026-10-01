/* The Hive Serpent: segmented chains that zigzag down through the crystal field, split when shot,
   bounce around the player zone, and plunge when they touch poison. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, F = G.field, TAU = U.TAU;
  const Ch = {};
  G.chain = Ch;
  const BOTTOM = C.ROWS - 1;
  let uid = 0;
  const HUES = [140, 18, 285, 195, 48];
  Ch.hueFor = (g) => HUES[(g.world || 0) % 5];

  function seg(cx, cy, dir, hp, carrier) {
    return { id: ++uid, cx, cy, pcx: cx, pcy: cy, dir, hp, max: hp, flash: 0, carrier: !!carrier, ang: 0, anim: Math.random() * 6 };
  }
  function newChain(g, segs, o) {
    const ch = Object.assign({ segs, dir: 1, vdir: 1, zone: false, poisoned: false, stepT: 0, mul: 1, required: true, harasser: false, hue: Ch.hueFor(g) }, o || {});
    g.chains.push(ch);
    return ch;
  }

  Ch.reset = function (g) { g.chains = []; g.pendingSolo = []; g.harassT = 8; };

  /* More centipedes every level: several full chains plus a growing swarm of solo heads. */
  Ch.spawnWave = function (g, n) {
    const segTotal = Math.min(36, 12 + Math.floor(1.6 * (n - 1)));
    const solos = Math.min(n - 1, 8);
    const body = segTotal - solos;
    const chains = Math.max(1, Math.min(1 + Math.floor((n - 1) / 2), 5, Math.floor(body / 3)));
    const hpHead = 1 + Math.floor((n - 1) / 8), hpBody = 1 + Math.floor((n - 1) / 14);
    g.chainSpeed = Math.min(13, 5.2 + 0.4 * n);
    const lens = [];
    for (let i = 0; i < chains; i++) lens.push(Math.floor(body / chains) + (i < body % chains ? 1 : 0));
    lens.forEach((len, i) => g.pendingSolo.push({ t: i === 0 ? 0 : 1.4 * i + Math.random() * 0.6, side: i % 2, hp: hpHead, hpBody, len }));
    for (let j = 0; j < solos; j++) g.pendingSolo.push({ t: 2.4 + j * 1.0 + Math.random() * 0.8, side: j % 2, hp: hpHead });
    g.carriersLeft = Math.min(4, 1 + Math.floor(n / 4));
  };

  function spawnChain(g, o) {
    const left = o.side === 0, dir = left ? 1 : -1, segs = [];
    for (let i = 0; i < o.len; i++) segs.push(seg(left ? -i : C.COLS + i, 0, dir, i === 0 ? o.hp : o.hpBody, false));
    if (g.carriersLeft > 0 && o.len > 3) { U.pick(segs.slice(2)).carrier = true; g.carriersLeft--; }
    newChain(g, segs, { dir, vdir: 1 });
  }

  Ch.spawnSolo = function (g, o) {
    o = o || {};
    const left = o.side === 0 || (o.side === undefined && Math.random() < 0.5);
    const row = o.row === undefined ? 0 : o.row;
    const s = seg(left ? -1 : C.COLS, row, left ? 1 : -1, o.hp || 1, false);
    newChain(g, [s], { dir: s.dir, vdir: o.vdir || 1, zone: !!o.harasser, required: !o.harasser, harasser: !!o.harasser, mul: o.harasser ? 1.25 : 1 });
  };

  Ch.requiredLeft = function (g) {
    let n = g.pendingSolo.length;
    for (const ch of g.chains) if (ch.required) n += ch.segs.length;
    return n;
  };

  function tick(g, ch) {
    const segs = ch.segs, h = segs[0];
    for (let i = segs.length - 1; i >= 1; i--) {
      const s = segs[i], l = segs[i - 1];
      s.pcx = s.cx; s.pcy = s.cy; s.cx = l.cx; s.cy = l.cy; s.dir = l.dir;
    }
    h.pcx = h.cx; h.pcy = h.cy;
    const vertical = () => {
      let ny = h.cy + ch.vdir;
      if (ch.vdir > 0 && ny > BOTTOM) { ch.vdir = -1; ch.zone = true; ny = h.cy - 1; }
      else if (ch.vdir < 0 && ny < C.ZONE_TOP) { ch.vdir = 1; ny = h.cy + 1; }
      h.cy = U.clamp(ny, 0, BOTTOM);
    };
    if (ch.poisoned) {
      if (h.cy < BOTTOM) h.cy++;
      else { ch.poisoned = false; ch.zone = true; ch.vdir = -1; }
    } else {
      const nx = h.cx + ch.dir, k = F.get(nx, h.cy);
      if (nx < 0 || nx >= C.COLS || k) {
        if (k && k.poison) { ch.poisoned = true; A.sfx.poison(); }
        vertical();
        ch.dir = -ch.dir;
      } else h.cx = nx;
    }
    h.dir = ch.dir;
  }

  Ch.update = function (g, dt) {
    for (let i = g.pendingSolo.length - 1; i >= 0; i--) {
      const p = g.pendingSolo[i];
      p.t -= dt;
      if (p.t <= 0) { g.pendingSolo.splice(i, 1); if (p.len) spawnChain(g, p); else Ch.spawnSolo(g, { side: p.side, hp: p.hp }); }
    }
    let inZone = false, harassers = 0;
    for (const ch of g.chains) {
      if (ch.zone && ch.required) inZone = true;
      if (ch.harasser) harassers++;
      for (const s of ch.segs) { if (s.flash > 0) s.flash -= dt; s.anim += dt; }
      ch.stepT += dt * g.chainSpeed * ch.mul * (ch.poisoned ? 1.6 : 1);
      let guard = 0;
      while (ch.stepT >= 1 && guard++ < 4) { ch.stepT -= 1; if (ch.segs.length) tick(g, ch); }
      if (ch.stepT > 1) ch.stepT = 1;
    }
    if (g.state === 'play' && inZone && !g.over) {
      g.harassT -= dt;
      const cap = Math.min(6, 1 + Math.floor(g.stage / 3));
      if (g.harassT <= 0) {
        g.harassT = Math.max(4, 10 - g.stage * 0.5);
        if (harassers < cap) Ch.spawnSolo(g, { harasser: true, row: U.randInt(C.ZONE_TOP, BOTTOM), vdir: Math.random() < 0.5 ? 1 : -1, hp: 1 + Math.floor((g.stage - 1) / 8) });
      }
    }
    for (let i = g.chains.length - 1; i >= 0; i--) if (!g.chains[i].segs.length) g.chains.splice(i, 1);
  };

  const tmpP = { x: 0, y: 0 };
  Ch.segPos = function (ch, s, out) {
    const t = U.clamp(ch.stepT, 0, 1);
    out.x = U.lerp(F.cx(s.pcx), F.cx(s.cx), t);
    out.y = U.lerp(F.cy(s.pcy), F.cy(s.cy), t);
    return out;
  };

  /* returns {ch, i} of a segment overlapping the circle, or null */
  Ch.hitTest = function (x, y, r, skipIds) {
    for (const ch of G.game.chains) {
      for (let i = 0; i < ch.segs.length; i++) {
        const s = ch.segs[i];
        if (skipIds && skipIds.indexOf(s.id) >= 0) continue;
        Ch.segPos(ch, s, tmpP);
        const rr = (i === 0 ? 14 : 12) + r;
        if (U.dist2(x, y, tmpP.x, tmpP.y) < rr * rr) return { ch, i, s };
      }
    }
    return null;
  };

  Ch.killSeg = function (g, ch, i, o) {
    o = o || {};
    const s = ch.segs[i], p = Ch.segPos(ch, s, { x: 0, y: 0 }), head = i === 0;
    if (!o.silent) {
      g.award(head ? 100 : 10, p.x, p.y);
      g.comboKill();
      A.sfx.kill(head ? 1 : 0);
    }
    FX.explosion(p.x, p.y, o.silent ? 0.8 : head ? 1.3 : 0.9, ch.hue);
    if (!o.noCrystal && F.inGrid(s.cx, s.cy) && !F.get(s.cx, s.cy)) F.add(s.cx, s.cy);
    if (s.carrier && !o.silent) g.dropPickup(p.x, p.y);
    const tail = ch.segs.slice(i + 1);
    ch.segs = ch.segs.slice(0, i);
    if (tail.length) {
      newChain(g, tail, { dir: tail[0].dir, vdir: ch.vdir, zone: ch.zone, stepT: ch.stepT, mul: ch.mul, required: ch.required, harasser: ch.harasser, hue: ch.hue });
    }
  };

  Ch.damage = function (g, ch, i, dmg, o) {
    const s = ch.segs[i];
    s.hp -= dmg; s.flash = 0.07;
    if (s.hp <= 0) Ch.killSeg(g, ch, i, o);
    else { A.sfx.hit(); const p = Ch.segPos(ch, s, { x: 0, y: 0 }); FX.sparks(p.x, p.y, 3, 120, 'hsla(40,100%,70%,1)', 0.25, 1.4); }
  };

  Ch.killAll = function (g, o) {
    for (const ch of g.chains.slice()) for (let i = ch.segs.length - 1; i >= 0; i--) if (ch.segs[i]) Ch.killSeg(g, ch, i, o);
  };

  Ch.draw = function (ctx, g) {
    const t = g.time;
    for (const ch of g.chains) {
      const art = GFX.art.seg(ch.hue), p = { x: 0, y: 0 };
      for (let i = ch.segs.length - 1; i >= 0; i--) {
        const s = ch.segs[i];
        Ch.segPos(ch, s, p);
        const dx = s.cx - s.pcx, dy = s.cy - s.pcy;
        if (dx || dy) {
          const target = Math.atan2(dy, dx) - Math.PI / 2;
          let d = target - s.ang;
          while (d > Math.PI) d -= TAU;
          while (d < -Math.PI) d += TAU;
          s.ang += d * 0.35;
        }
        const f = Math.floor(t * 12 + s.anim) % 2;
        if (s.carrier) {
          ctx.globalCompositeOperation = 'lighter';
          GFX.drawGlow(ctx, 'hsla(48,100%,60%,1)', p.x, p.y, 26 + Math.sin(t * 8 + i) * 3, 0.65);
          ctx.globalCompositeOperation = 'source-over';
        }
        const img = i === 0 ? (s.flash > 0 ? art.headF[f] : art.head[f]) : (s.flash > 0 ? art.bodyF[f] : art.body[f]);
        GFX.draw(ctx, img, p.x, p.y, s.ang, 1, 1);
      }
    }
  };
})((window.SGS = window.SGS || {}));
