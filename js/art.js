/* Centipede-world art: crystals, serpent segments and heads, pests, boss plates. All procedural. */
(function (G) {
  'use strict';
  const U = G.U, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly, mirror = GFX.mirror, flashOf = GFX.flashOf;
  const A = {};
  GFX.art = A;

  /* ---------- crystals: 3 shapes x 4 damage states x normal/poisoned ---------- */
  function crystalSprite(variant, dmg, poison) {
    return mk(36, 36, (x) => {
      const rnd = GFX.mulberry(variant * 131 + 17);
      const hue = poison ? 112 : 200, hue2 = poison ? 285 : 220;
      const shards = [];
      for (let i = 0; i < 5; i++) shards.push({ ox: (rnd() * 2 - 1) * 9, h: 13 + rnd() * 10, w: 6 + rnd() * 3.5, tilt: (rnd() - 0.5) * 0.8 });
      shards.sort((a, b) => a.h - b.h);
      const use = shards.slice(5 - [5, 4, 3, 2][dmg]);
      x.fillStyle = rg(x, 0, 12, 0, 16, [[0, U.hsl(hue, 90, 60, 0.45)], [1, U.hsl(hue, 90, 50, 0)]]);
      x.fillRect(-18, -6, 36, 30);
      x.shadowColor = U.hsl(hue, 100, 60, 0.95); x.shadowBlur = 9;
      use.forEach((sh) => {
        const h = sh.h * (1 - dmg * 0.1), w = sh.w;
        x.save(); x.translate(sh.ox, 11); x.rotate(sh.tilt);
        x.fillStyle = lg(x, -w / 2, 0, w / 2, 0, [[0, U.hsl(hue, 90, 72)], [0.5, U.hsl(hue, 85, 50)], [1, U.hsl(hue2, 75, 26)]]);
        poly(x, [[-w / 2, 0], [-w / 2, -h * 0.7], [0, -h], [w / 2, -h * 0.7], [w / 2, 0], [0, w * 0.25]]);
        x.fill();
        x.shadowBlur = 0;
        x.strokeStyle = U.hsl(hue, 100, 85, 0.9); x.lineWidth = 1; x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.55)';
        x.beginPath(); x.moveTo(0, -h); x.lineTo(0, w * 0.25); x.stroke();
        x.restore();
        x.shadowColor = U.hsl(hue, 100, 60, 0.95); x.shadowBlur = 9;
      });
      x.shadowBlur = 0;
      if (dmg > 0) {
        x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1.2;
        const r2 = GFX.mulberry(variant * 7 + dmg);
        for (let k = 0; k < dmg; k++) {
          x.beginPath(); let px = (r2() - 0.5) * 12, py = -2 - k * 3; x.moveTo(px, py);
          for (let j = 0; j < 3; j++) { px += (r2() - 0.5) * 7; py += 4 + r2() * 3; x.lineTo(px, py); }
          x.stroke();
        }
      }
      if (poison) {
        x.fillStyle = 'rgba(170,255,120,0.9)';
        for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(-9 + k * 6, -10 + (k % 2) * 8, 1.6 + (k % 2), 0, TAU); x.fill(); }
      }
    }, 2);
  }
  A.initCrystals = function () {
    A.crystal = [];
    for (let v = 0; v < 3; v++) {
      A.crystal[v] = [];
      for (let d = 0; d < 4; d++) A.crystal[v][d] = [crystalSprite(v, d, false), crystalSprite(v, d, true)];
    }
  };

  /* ---------- serpent segments and heads, tinted per world hue ---------- */
  function bodyFrame(hue, frame) {
    return (x) => {
      const legA = frame ? 0.5 : -0.2;
      x.strokeStyle = U.hsl(hue, 70, 70); x.lineWidth = 2.2;
      mirror(x, (c) => {
        for (let i = 0; i < 2; i++) {
          c.beginPath(); c.moveTo(7, -3 + i * 7); c.lineTo(13 + (i ? 1 : -1) * Math.sin(legA) * 3, 0 + i * 8 + legA * 3); c.lineTo(15, 5 + i * 8); c.stroke();
        }
      });
      x.shadowColor = U.hsl(hue, 100, 60, 0.95); x.shadowBlur = 8;
      x.fillStyle = rg(x, -3, -3, 1, 14, [[0, U.hsl(hue, 90, 82)], [0.45, U.hsl(hue, 85, 48)], [1, U.hsl(hue + 25, 80, 18)]]);
      x.beginPath(); x.arc(0, 0, 11.5, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(hue, 100, 82, 0.95); x.lineWidth = 1.4; x.stroke();
      x.strokeStyle = 'rgba(0,10,20,0.45)'; x.lineWidth = 1.2;
      x.beginPath(); x.arc(0, 0, 7.5, 0.4, 2.7); x.stroke();
      x.fillStyle = U.hsl(hue + 40, 100, 75, 0.95);
      x.beginPath(); x.ellipse(0, 0, 2.2, 5, 0, 0, TAU); x.fill();
    };
  }
  function headFrame(hue, frame) {
    return (x) => {
      const op = frame ? 0.55 : 0.2;
      x.shadowColor = U.hsl(hue, 100, 60, 0.95); x.shadowBlur = 9;
      mirror(x, (c) => {
        c.strokeStyle = U.hsl(hue, 80, 78); c.lineWidth = 3.2;
        c.beginPath(); c.moveTo(6, 9); c.quadraticCurveTo(14 + op * 4, 16, 8 - op * 6, 22); c.stroke();
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(9, -2); c.lineTo(17, 2); c.lineTo(18, 9); c.stroke();
      });
      x.fillStyle = rg(x, -4, -5, 1, 17, [[0, U.hsl(hue, 90, 85)], [0.4, U.hsl(hue, 85, 50)], [1, U.hsl(hue + 25, 80, 16)]]);
      x.beginPath(); x.ellipse(0, 1, 14, 14.5, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(hue, 100, 85, 0.95); x.lineWidth = 1.5; x.stroke();
      x.strokeStyle = 'rgba(0,10,20,0.5)'; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(0, -12); x.lineTo(0, 4); x.stroke();
      x.fillStyle = '#ff3d5e'; x.shadowColor = '#ff3d5e'; x.shadowBlur = 7;
      x.beginPath(); x.ellipse(-5.5, 7, 3, 4, 0.3, 0, TAU); x.ellipse(5.5, 7, 3, 4, -0.3, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.fillStyle = '#fff'; x.beginPath(); x.arc(-5.5, 8, 1.1, 0, TAU); x.arc(5.5, 8, 1.1, 0, TAU); x.fill();
    };
  }
  const segCache = {};
  A.seg = function (hue) {
    if (segCache[hue]) return segCache[hue];
    const body = [mk(40, 40, bodyFrame(hue, 0)), mk(40, 40, bodyFrame(hue, 1))];
    const head = [mk(48, 52, headFrame(hue, 0)), mk(48, 52, headFrame(hue, 1))];
    return (segCache[hue] = { body, head, bodyF: body.map(flashOf), headF: head.map(flashOf) });
  };

  /* ---------- pests ---------- */
  function skitterFrame(frame) {
    return (x) => {
      const k = frame ? 1 : -1;
      x.shadowColor = 'rgba(255,60,200,0.95)'; x.shadowBlur = 8;
      x.strokeStyle = '#ff7ae0'; x.lineWidth = 2.2;
      mirror(x, (c) => {
        for (let i = 0; i < 4; i++) {
          const y0 = -6 + i * 4.5, sw = (i % 2 ? k : -k) * 3;
          c.beginPath(); c.moveTo(4, y0); c.lineTo(11, y0 - 5 + sw); c.lineTo(17, y0 + 4 + sw); c.stroke();
        }
      });
      x.fillStyle = rg(x, -2, -3, 1, 13, [[0, '#ffd0f4'], [0.4, '#e02ab8'], [1, '#4a0a56']]);
      x.beginPath(); x.ellipse(0, 0, 8.5, 10.5, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#ffd0f4'; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = '#7dffd8'; x.beginPath(); x.arc(-3, 6, 2, 0, TAU); x.arc(3, 6, 2, 0, TAU); x.fill();
      x.fillStyle = 'rgba(40,0,50,0.6)'; x.beginPath(); x.ellipse(0, -4, 3, 4.5, 0, 0, TAU); x.fill();
    };
  }
  function dropperFrame(frame) {
    return (x) => {
      const k = frame ? 3 : 0;
      x.shadowColor = 'rgba(255,170,40,0.95)'; x.shadowBlur = 8;
      x.strokeStyle = '#ffcf6a'; x.lineWidth = 2.4;
      mirror(x, (c) => {
        c.beginPath(); c.moveTo(5, 2); c.lineTo(11 + k, -6); c.lineTo(9, -16 - k); c.stroke();
        c.lineWidth = 1.4; c.beginPath(); c.moveTo(3, 14); c.lineTo(8, 20); c.stroke();
        c.fillStyle = 'rgba(200,245,255,0.5)'; c.beginPath(); c.ellipse(9 + k, 6, 5, 9, 0.5, 0, TAU); c.fill();
      });
      x.fillStyle = rg(x, -2, -3, 1, 14, [[0, '#fff0b0'], [0.4, '#ff9a1a'], [1, '#5a2000']]);
      x.beginPath(); x.ellipse(0, -2, 9, 13, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#fff0b0'; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = '#ffb43a'; x.beginPath(); x.arc(0, 13, 6, 0, TAU); x.fill();
      x.fillStyle = '#ff2d4a'; x.beginPath(); x.arc(-2.6, 14.5, 1.8, 0, TAU); x.arc(2.6, 14.5, 1.8, 0, TAU); x.fill();
      x.fillStyle = '#5a2000'; for (let i = 0; i < 3; i++) x.fillRect(-7, -9 + i * 5, 14, 1.6);
    };
  }
  function venomDraw(frame) {
    return (x) => {
      x.shadowColor = 'rgba(150,255,90,0.9)'; x.shadowBlur = 8;
      x.strokeStyle = '#b48aff'; x.lineWidth = 2.4;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-6 + i * 6, 6); x.lineTo(-8 + i * 6 + (frame ? 3 : -3), 12); x.stroke(); }
      x.lineWidth = 4.5;
      x.beginPath(); x.moveTo(-10, -1); x.quadraticCurveTo(-24, -4, -22, -18); x.quadraticCurveTo(-20, -24, -12, -22); x.stroke();
      x.fillStyle = '#b7ff6a'; poly(x, [[-14, -22], [-9, -26], [-9, -18]]); x.fill();
      x.fillStyle = rg(x, 0, -3, 1, 16, [[0, '#e6d2ff'], [0.4, '#7a3ee0'], [1, '#1e0a4a']]);
      x.beginPath(); x.ellipse(-1, 0, 14, 8.5, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#e6d2ff'; x.lineWidth = 1.2; x.stroke();
      x.strokeStyle = '#b48aff'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(11, -3); x.quadraticCurveTo(20, -10, 23, -2); x.moveTo(11, 4); x.quadraticCurveTo(20, 11, 23, 3); x.stroke();
      x.fillStyle = '#b7ff6a'; x.beginPath(); x.arc(8, -2, 1.8, 0, TAU); x.arc(8, 3, 1.8, 0, TAU); x.fill();
    };
  }

  /* ---------- boss serpent parts, tinted per world hue ---------- */
  function plateDraw(hue, gun) {
    return (x) => {
      const oct = [];
      for (let i = 0; i < 8; i++) oct.push([Math.cos(i / 8 * TAU + TAU / 16) * 32, Math.sin(i / 8 * TAU + TAU / 16) * 32]);
      mirror(x, (c) => {
        c.strokeStyle = U.hsl(hue, 70, 55); c.lineWidth = 3.5;
        c.beginPath(); c.moveTo(29, -8); c.lineTo(38, -4); c.lineTo(36, 8); c.stroke();
      });
      x.shadowColor = U.hsl(hue, 100, 60, 0.95); x.shadowBlur = 10;
      poly(x, oct);
      x.fillStyle = lg(x, -30, -30, 30, 30, [[0, U.hsl(hue, 30, 42)], [0.5, U.hsl(hue, 34, 22)], [1, U.hsl(hue, 40, 10)]]);
      x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(hue, 100, 65); x.lineWidth = 2.6; x.stroke();
      poly(x, oct.map((p) => [p[0] * 0.72, p[1] * 0.72]));
      x.fillStyle = 'rgba(5,8,18,0.7)'; x.fill();
      x.strokeStyle = U.hsl(hue, 90, 75, 0.8); x.lineWidth = 1.2; x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(Math.cos(i / 8 * TAU) * 27, Math.sin(i / 8 * TAU) * 27, 1.4, 0, TAU); x.fill(); }
      if (gun) {
        x.fillStyle = lg(x, -5, 0, 5, 0, [[0, '#26314f'], [0.5, '#a8bad8'], [1, '#26314f']]);
        x.fillRect(-4.5, 2, 9, 26);
        x.fillStyle = '#ff6a3a'; x.fillRect(-5.5, 24, 11, 4);
        x.fillStyle = rg(x, 0, -2, 0, 9, [[0, '#fff'], [0.5, U.hsl(hue, 100, 60)], [1, 'rgba(0,0,0,0)']]);
        x.beginPath(); x.arc(0, -2, 9, 0, TAU); x.fill();
      } else {
        x.fillStyle = rg(x, 0, 0, 0, 13, [[0, '#ffffff'], [0.4, U.hsl(hue, 100, 62)], [1, U.hsl(hue + 30, 80, 20, 0)]]);
        x.beginPath(); x.arc(0, 0, 13, 0, TAU); x.fill();
      }
    };
  }
  function bossHeadDraw(hue) {
    return (x) => {
      x.shadowColor = U.hsl(hue, 100, 60, 0.95); x.shadowBlur = 12;
      mirror(x, (c) => {
        c.strokeStyle = U.hsl(hue, 75, 70); c.lineWidth = 7;
        c.beginPath(); c.moveTo(24, 22); c.quadraticCurveTo(52, 34, 34, 62); c.stroke();
        c.lineWidth = 4;
        c.beginPath(); c.moveTo(36, -6); c.lineTo(56, 2); c.lineTo(58, 26); c.stroke();
        c.beginPath(); c.moveTo(30, -30); c.lineTo(44, -50); c.stroke();
      });
      x.fillStyle = lg(x, -40, -40, 40, 44, [[0, U.hsl(hue, 40, 46)], [0.5, U.hsl(hue, 38, 24)], [1, U.hsl(hue, 45, 10)]]);
      x.beginPath(); x.ellipse(0, 0, 44, 46, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(hue, 100, 68); x.lineWidth = 3; x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, -44); x.lineTo(0, -22); x.moveTo(-30, -28); x.quadraticCurveTo(0, -18, 30, -28); x.stroke();
      x.fillStyle = '#ff3d5e'; x.shadowColor = '#ff3d5e'; x.shadowBlur = 10;
      x.beginPath(); x.ellipse(-20, 20, 8, 11, 0.4, 0, TAU); x.ellipse(20, 20, 8, 11, -0.4, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.fillStyle = '#fff'; x.beginPath(); x.arc(-20, 22, 2.6, 0, TAU); x.arc(20, 22, 2.6, 0, TAU); x.fill();
      x.fillStyle = 'rgba(4,6,14,0.9)'; x.beginPath(); x.arc(0, -4, 17, 0, TAU); x.fill();
      x.strokeStyle = U.hsl(hue, 90, 70); x.lineWidth = 2; x.stroke();
    };
  }
  const bossCache = {};
  A.boss = function (hue) {
    if (bossCache[hue]) return bossCache[hue];
    const plate = mk(88, 88, plateDraw(hue, false)), gun = mk(88, 88, plateDraw(hue, true)), head = mk(136, 148, bossHeadDraw(hue));
    return (bossCache[hue] = { plate, gun, head, plateF: flashOf(plate), gunF: flashOf(gun), headF: flashOf(head) });
  };

  A.init = function () {
    const s = GFX.spr, f = GFX.flash;
    A.initCrystals();
    s.skitter = [mk(48, 48, skitterFrame(0)), mk(48, 48, skitterFrame(1))];
    s.dropper = [mk(44, 52, dropperFrame(0)), mk(44, 52, dropperFrame(1))];
    s.venom = [mk(64, 52, venomDraw(0)), mk(64, 52, venomDraw(1))];
    for (const k of ['skitter', 'dropper', 'venom']) f[k] = s[k].map(flashOf);
  };
  GFX.initArt = A.init;
})((window.SGS = window.SGS || {}));
