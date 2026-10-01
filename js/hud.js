/* HUD, banners and the decorative side panels. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const W = C.W, H = C.H;
  const HUD = {};
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

  const GS = 2, gcache = new Map();
  function glowText(ctx, s, x, y, size, color, align, weight, glow) {
    const key = s + '|' + size + '|' + color + '|' + weight + '|' + glow;
    let e = gcache.get(key);
    if (!e) {
      if (gcache.size > 120) gcache.clear();
      const f = weight + ' ' + (size * GS) + 'px ' + FONT, c = document.createElement('canvas'), cx = c.getContext('2d');
      cx.font = f;
      const tw = cx.measureText(s).width, pad = 16 * GS;
      c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(size * GS * 1.5 + pad * 2);
      cx.font = f; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
      cx.shadowColor = glow; cx.shadowBlur = 10 * GS; cx.fillStyle = color; cx.fillText(s, pad, pad + size * GS);
      e = { c, tw: tw / GS, pad: pad / GS, by: pad / GS + size };
      gcache.set(key, e);
    }
    const ox = align === 'center' ? -e.tw / 2 : align === 'right' ? -e.tw : 0;
    ctx.drawImage(e.c, x + ox - e.pad, y - e.by, e.c.width / GS, e.c.height / GS);
  }
  function txt(ctx, s, x, y, size, color, align, weight, glow) {
    weight = weight || 800;
    if (glow) { glowText(ctx, s, x, y, size, color, align, weight, glow); return; }
    ctx.font = weight + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  HUD.txt = txt;

  HUD.draw = function (ctx, g) {
    if (g.demo) return;
    const p = g.player, spr = GFX.spr;
    const grad = ctx.createLinearGradient(0, 0, 0, 76);
    grad.addColorStop(0, 'rgba(2,4,18,0.8)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 76);
    txt(ctx, 'SCORE', 16, 16, 11, '#7dffb0', 'left', 800);
    txt(ctx, U.fmt(g.score), 16, 38, 24, '#ffffff', 'left', 800, 'rgba(120,255,190,0.8)');
    txt(ctx, 'HIGH SCORE', W / 2, 16, 11, '#7dffb0', 'center', 800);
    txt(ctx, U.fmt(Math.max(g.hi, g.score)), W / 2, 38, 24, '#9fe8ff', 'center', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'LEVEL', W - 16, 16, 11, '#7dffb0', 'right', 800);
    txt(ctx, String(g.stage), W - 16, 38, 24, '#ffffff', 'right', 800, 'rgba(120,255,190,0.8)');
    // second row: lives + combo (left), weapon pips (center), bombs + shield (right)
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) GFX.draw(ctx, spr.player, 26 + i * 24, 62, 0, 0.3, 0.3);
    if (g.mult > 1) {
      const bx = 26 + Math.max(0, g.lives - 1) * 24 + 12;
      txt(ctx, 'x' + g.mult, bx, 66, 18, '#ffd24a', 'left', 900, 'rgba(255,200,60,0.9)');
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx + 30, 58, 44, 5);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(bx + 30, 58, 44 * Math.max(0, g.comboT / 2.4), 5);
    }
    for (let i = 0; i < C.MAX_TIER; i++) {
      ctx.fillStyle = i < p.tier ? '#ffd24a' : 'rgba(255,255,255,0.18)';
      if (i < p.tier) { ctx.globalAlpha = 0.55; ctx.drawImage(GFX.glow('rgba(255,210,74,1)'), W / 2 - 46 + i * 20, 47, 32, 28); ctx.globalAlpha = 1; }
      ctx.fillRect(W / 2 - 38 + i * 20, 58, 16, 6);
    }
    if (p.shield > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 40, 68, 80, 3);
      ctx.fillStyle = '#6cc8ff'; ctx.fillRect(W / 2 - 40, 68, 80 * p.shield / C.SHIELD_TIME, 3);
    }
    for (let i = 0; i < p.bombs; i++) {
      const bx = W - 20 - i * 22, by = 62;
      ctx.globalAlpha = 0.6; ctx.drawImage(GFX.glow('rgba(255,77,109,1)'), bx - 12, by - 12, 24, 24); ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(bx - 1, by - 10, 2, 4);
    }
    HUD.banner(ctx, g);
  };

  HUD.banner = function (ctx, g) {
    const b = g.banner;
    if (!b) return;
    const k = b.t / b.life;
    const a = k < 0.1 ? k / 0.1 : k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1;
    const sc = 1 + (k < 0.1 ? (0.1 - k) * 3 : 0);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * 0.4);
    if (b.warn) {
      const flick = Math.floor(b.t * 4) % 2;
      const g2 = ctx.createLinearGradient(0, -50, 0, 50);
      g2.addColorStop(0, 'rgba(255,40,40,0)'); g2.addColorStop(0.5, 'rgba(255,40,40,' + (flick ? 0.5 : 0.28) + ')'); g2.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g2; ctx.fillRect(-W / 2, -50, W, 100);
      ctx.scale(sc, sc);
      txt(ctx, 'WARNING', 0, 12, 56, flick ? '#ff6a6a' : '#ffffff', 'center', 900, 'rgba(255,40,40,1)');
      txt(ctx, b.sub, 0, 44, 15, '#ffd0d0', 'center', 700);
    } else if (b.small) {
      txt(ctx, b.text, 0, 0, 26, '#7dffb8', 'center', 900, 'rgba(60,255,160,0.9)');
    } else {
      ctx.scale(sc, sc);
      txt(ctx, b.text, 0, 0, b.text.length > 18 ? 30 : 46, '#ffffff', 'center', 900, 'rgba(90,255,190,1)');
      if (b.sub) txt(ctx, b.sub, 0, 36, 22, '#ffd24a', 'center', 800, 'rgba(255,200,60,0.9)');
    }
    ctx.restore();
  };

  /* decorative panels on wide windows; coords are screen pixels */
  const paintSides = function (ctx, v, g) {
    const sw = v.ox;
    if (sw < 150) return;
    const sc = Math.min(1.15, sw / 240), cx1 = sw / 2, cx2 = v.ox + W * v.s + sw / 2, top = v.oy + 70 * sc;
    const col = 'rgba(160,215,255,0.8)';
    ctx.save();
    txt(ctx, 'SPACE CENTI SHOOTER', cx1, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(90,255,190,0.9)');
    const help = ['MOVE', '← ↑ → ↓  /  WASD  /  MOUSE', 'FIRE', 'SPACE  /  LEFT CLICK', 'SMART BOMB', 'B  /  RIGHT CLICK', 'PAUSE', 'P  /  ESC'];
    help.forEach((s, i) => txt(ctx, s, cx1, top + 44 * sc + i * 20 * sc, (i % 2 ? 12 : 10) * sc, i % 2 ? col : '#7dffb0', 'center', i % 2 ? 700 : 800));
    txt(ctx, 'TOP PILOTS', cx2, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(90,255,190,0.9)');
    G.scores.list.slice(0, 7).forEach((r, i) => txt(ctx, (i + 1) + '. ' + r.name + '  ' + U.fmt(r.score), cx2, top + 34 * sc + i * 22 * sc, 13 * sc, i === 0 ? '#ffd24a' : col, 'center', 700));
    txt(ctx, 'FREE TO PLAY & SHARE', cx2, top + 230 * sc, 10 * sc, '#7dffb0', 'center', 800);
    txt(ctx, 'github.com/nbwillcox', cx2, top + 248 * sc, 12 * sc, col, 'center', 700);
    txt(ctx, '/SpaceCentiShooter', cx2, top + 264 * sc, 12 * sc, col, 'center', 700);
    ctx.restore();
  };

  let sideCache = null, sideKey = '';
  HUD.sides = function (ctx, v, g) {
    if (v.ox < 150) return;
    const key = [v.w, v.h, v.rs.toFixed(2), Math.round(v.ox), Math.round(v.oy), v.s.toFixed(3), G.scores.list.slice(0, 7).map((r) => r.name + r.score).join(',')].join('|');
    if (key !== sideKey || !sideCache) {
      sideKey = key;
      const pw = Math.round(v.ox * v.rs), ph = Math.round(v.h * v.rs);
      const full = document.createElement('canvas');
      full.width = Math.round(v.w * v.rs); full.height = ph;
      const x = full.getContext('2d');
      x.scale(v.rs, v.rs);
      paintSides(x, v, g);
      const strip = (sx) => { const c = document.createElement('canvas'); c.width = pw; c.height = ph; c.getContext('2d').drawImage(full, sx, 0, pw, ph, 0, 0, pw, ph); return c; };
      sideCache = { l: strip(0), r: strip(full.width - pw) };
    }
    ctx.drawImage(sideCache.l, 0, 0, v.ox, v.h);
    ctx.drawImage(sideCache.r, v.w - v.ox, 0, v.ox, v.h);
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
