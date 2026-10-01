(function (G) {
  'use strict';

  const CELL = 30;
  G.C = {
    W: 540,
    H: 720,
    REPO: 'https://github.com/nbwillcox/SpaceCentiShooter',
    CELL,
    COLS: 18,
    ROWS: 21,
    GY: 78, // top of the grid in playfield pixels
    ZONE_TOP: 15, // first grid row of the player zone
    PLAYER_SPEED: 400,
    MOUSE_SPEED: 1500,
    START_LIVES: 3,
    BOSS_EVERY: 5,
    EXTRA_LIFE_AT: [15000, 50000],
    EXTRA_LIFE_EVERY: 60000,
    MAX_TIER: 4,
    MAX_DRONES: 2,
    MAX_BOMBS: 3,
    SHIELD_TIME: 14,
    SHIP_SCALE: 0.5,
  };
  G.C.ZONE_Y0 = G.C.GY + G.C.ZONE_TOP * CELL;
  G.C.ZONE_Y1 = G.C.GY + G.C.ROWS * CELL;

  const KEY = 'spacecentishooter.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false };

  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; }
  } catch (e) { /* storage unavailable */ }
  S.save = function () {
    try {
      const o = {};
      for (const k in defaults) o[k] = S[k];
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    S.reduced = true;
  }
  G.settings = S;
})((window.SGS = window.SGS || {}));
