/* The crystal field: a COLS x ROWS grid of destructible, poisonable crystals that steer the chains. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio;
  const F = { cells: [], count: 0 };
  G.field = F;

  F.cx = (c) => c * C.CELL + C.CELL / 2;
  F.cy = (r) => C.GY + r * C.CELL + C.CELL / 2;
  F.col = (x) => Math.floor(x / C.CELL);
  F.row = (y) => Math.floor((y - C.GY) / C.CELL);
  F.inGrid = (c, r) => c >= 0 && c < C.COLS && r >= 0 && r < C.ROWS;
  F.get = (c, r) => (F.inGrid(c, r) ? F.cells[r * C.COLS + c] : null);

  F.reset = function () {
    F.cells = new Array(C.COLS * C.ROWS).fill(null);
    F.count = 0;
  };
  F.add = function (c, r, poison) {
    if (!F.inGrid(c, r) || F.get(c, r)) return null;
    const k = { hp: 4, c, r, poison: !!poison, v: U.randInt(0, 2), flash: 0, pop: 0.3 };
    F.cells[r * C.COLS + c] = k; F.count++;
    return k;
  };
  F.remove = function (c, r) {
    if (F.get(c, r)) { F.cells[r * C.COLS + c] = null; F.count--; }
  };
  F.fill = function (n) {
    let guard = 0;
    while (F.count < n && guard++ < 500) {
      const c = U.randInt(0, C.COLS - 1), r = U.randInt(2, C.ZONE_TOP - 2);
      if (F.get(c, r) || F.get(c - 1, r) || F.get(c + 1, r)) continue;
      F.add(c, r);
    }
    for (const k of F.cells) if (k) k.pop = 0;
  };

  /* returns true if the crystal was destroyed */
  F.hit = function (g, c, r, dmg) {
    const k = F.get(c, r);
    if (!k) return false;
    k.hp -= dmg; k.flash = 0.08;
    const x = F.cx(c), y = F.cy(r);
    if (k.hp <= 0) {
      F.remove(c, r);
      FX.sparks(x, y, 9, 150, k.poison ? 'hsla(110,100%,65%,1)' : 'hsla(200,100%,70%,1)', 0.45);
      FX.glowPop(x, y, 20, k.poison ? 'hsla(110,100%,60%,1)' : 'hsla(200,100%,65%,1)', 0.25);
      FX.debris(x, y, 3, k.poison ? 'hsla(110,100%,60%,1)' : 'hsla(200,100%,65%,1)', 110);
      A.sfx.crystalBreak();
      if (g && !g.demo) g.addScore(5);
      return true;
    }
    A.sfx.crystalHit();
    FX.sparks(x, y, 3, 100, 'hsla(200,100%,80%,1)', 0.2, 1.3);
    return false;
  };
  /* silent removal (pests eating crystals) */
  F.eat = function (c, r) {
    const k = F.get(c, r);
    if (!k) return;
    FX.sparks(F.cx(c), F.cy(r), 5, 110, 'hsla(300,100%,70%,1)', 0.35);
    F.remove(c, r);
  };
  F.damaged = function () {
    const out = [];
    for (const k of F.cells) if (k && (k.hp < 4 || k.poison)) out.push(k);
    return out;
  };
  F.repair = function (k) {
    k.hp = 4; k.poison = false; k.pop = 0.3; k.flash = 0.15;
    const x = F.cx(k.c), y = F.cy(k.r);
    FX.ring(x, y, 4, 24, 'hsla(190,100%,75%,1)', 0.3, 2);
    FX.sparks(x, y, 4, 90, 'hsla(190,100%,80%,1)', 0.3);
  };
  /* crystals within radius of a point are shattered (used when the player respawns) */
  F.clearAround = function (x, y, rad) {
    for (const k of F.cells.slice()) {
      if (!k) continue;
      if (U.dist2(F.cx(k.c), F.cy(k.r), x, y) < rad * rad) { FX.sparks(F.cx(k.c), F.cy(k.r), 6, 120, 'hsla(200,100%,70%,1)', 0.35); F.remove(k.c, k.r); }
    }
  };

  F.update = function (dt) {
    for (const k of F.cells) {
      if (!k) continue;
      if (k.flash > 0) k.flash -= dt;
      if (k.pop > 0) k.pop -= dt;
    }
  };

  F.draw = function (ctx, t) {
    const A2 = GFX.art;
    for (const k of F.cells) {
      if (!k) continue;
      const x = F.cx(k.c), y = F.cy(k.r), dmg = U.clamp(4 - Math.ceil(k.hp), 0, 3);
      const sc = k.pop > 0 ? 1 + k.pop * 1.2 : 1;
      if (k.poison) {
        ctx.globalCompositeOperation = 'lighter';
        GFX.drawGlow(ctx, 'hsla(110,100%,55%,1)', x, y, 22 + Math.sin(t * 5 + k.c) * 3, 0.55);
        ctx.globalCompositeOperation = 'source-over';
      }
      GFX.draw(ctx, A2.crystal[k.v][dmg][k.poison ? 1 : 0], x, y, 0, sc, sc);
      if (k.flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        GFX.drawGlow(ctx, 'rgba(255,255,255,1)', x, y, 18, 0.8);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  };
})((window.SGS = window.SGS || {}));
