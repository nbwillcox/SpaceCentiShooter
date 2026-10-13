/* Touch controls for SpaceCentiShooter: drag anywhere to move the ship (it hovers above the finger and fires while touching), BOMB button, pause button. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacecentishooter', title: 'SpaceCentiShooter', orient: 'portrait', accent: '#3dff9e',
  hint: '<b>Drag</b> to move the ship (it hovers above your finger) &nbsp; it <b>fires</b> while you touch &nbsp; <b>BOMB</b> button: smart bomb',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { l: 16, b: 60 }, mirror: true },                                  /* the top corners are HUD, so pause sits in the thumb band */
  controls: [
    { t: 'drag', id: 'steer', zone: [0, 0, 1, 1], mirror: false, dy: -64 },
    { t: 'btn', id: 'bomb', label: 'BOMB', key: 'KeyB', hold: false, size: 84, pos: { r: 18, b: 44 } },
  ],
};
