// @owner codex
(function () {
  const held = new Set();
  const pressed = new Set();
  const released = new Set();
  const keyMap = {
    ArrowLeft: ['left'], KeyA: ['left'], ArrowRight: ['right'], KeyD: ['right'],
    ArrowUp: ['up', 'jump'], KeyW: ['up', 'jump'], ArrowDown: ['down'], KeyS: ['down'],
    Space: ['jump'], KeyJ: ['dash'], ShiftLeft: ['dash'], ShiftRight: ['dash'],
    KeyR: ['restart'], KeyM: ['mute'], Escape: ['pause'], KeyP: ['pause']
  };

  function setAction(action, down) {
    if (down && !held.has(action)) pressed.add(action);
    if (!down && held.has(action)) released.add(action);
    if (down) held.add(action); else held.delete(action);
  }

  window.addEventListener('keydown', (event) => {
    const actions = keyMap[event.code];
    if (!actions) return;
    actions.forEach((action) => setAction(action, true));
    event.preventDefault();
    if (Park.engine.audio) Park.engine.audio.resume();
  }, { passive: false });

  window.addEventListener('keyup', (event) => {
    const actions = keyMap[event.code];
    if (!actions) return;
    actions.forEach((action) => setAction(action, false));
    event.preventDefault();
  }, { passive: false });

  document.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.dataset.action;
    const release = (event) => {
      if (event) event.preventDefault();
      setAction(action, false);
      button.classList.remove('is-held');
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setAction(action, true);
      button.classList.add('is-held');
      if (Park.engine.audio) Park.engine.audio.resume();
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  function clear() {
    held.clear();
    pressed.clear();
    released.clear();
    document.querySelectorAll('[data-action]').forEach((button) => button.classList.remove('is-held'));
  }
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });

  Park.engine.input = {
    state() {
      return {
        moveX: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
        moveY: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0),
        jumpDown: held.has('jump'),
        jumpPressed: pressed.has('jump'),
        jumpReleased: released.has('jump'),
        dashPressed: pressed.has('dash'),
        restartPressed: pressed.has('restart'),
        pausePressed: pressed.has('pause'),
        mutePressed: pressed.has('mute')
      };
    },
    afterStep() { pressed.clear(); released.clear(); },
    press: setAction,
    clear
  };
})();
