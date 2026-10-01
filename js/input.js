/* Keyboard + mouse input. Free 2D movement in the player zone; Space or left mouse fires. */
(function (G) {
  'use strict';
  const I = { left: false, right: false, up: false, down: false, fire: false, mouseX: 0, mouseY: 0, mouseActive: false, _bomb: false, _pause: false, _any: false };
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyB', 'KeyX']);

  I.takeBomb = () => { const b = I._bomb; I._bomb = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { I.left = I.right = I.up = I.down = I.fire = false; I._bomb = I._pause = I._any = false; };

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') { I.left = true; I.mouseActive = false; }
    else if (c === 'ArrowRight' || c === 'KeyD') { I.right = true; I.mouseActive = false; }
    else if (c === 'Space') I.fire = true;
    else if (c === 'ArrowUp' || c === 'KeyW') { I.up = true; I.mouseActive = false; }
    else if (c === 'ArrowDown' || c === 'KeyS') { I.down = true; I.mouseActive = false; }
    else if ((c === 'KeyB' || c === 'KeyX') && !e.repeat) I._bomb = true;
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') I.left = false;
    else if (c === 'ArrowRight' || c === 'KeyD') I.right = false;
    else if (c === 'ArrowUp' || c === 'KeyW') I.up = false;
    else if (c === 'ArrowDown' || c === 'KeyS') I.down = false;
    else if (c === 'Space') I.fire = false;
  });
  window.addEventListener('blur', () => I.clear());

  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) I.fire = true;
      else if (e.button === 2) I._bomb = true;
      I._any = true;
      e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; });
  window.addEventListener('mousemove', (e) => {
    const v = G.view;
    if (!v) return;
    I.mouseX = (e.clientX - v.ox) / v.s;
    I.mouseY = (e.clientY - v.oy) / v.s;
    if (e.movementX !== 0 || e.movementY !== 0) I.mouseActive = true;
  });

  G.input = I;
})((window.SGS = window.SGS || {}));
