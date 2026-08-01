// @owner codex
(function () {
  const STEP = 1 / 120;
  const MAX_STEPS = 8;
  let target = null;
  let running = false;
  let last = 0;
  let accumulator = 0;

  function frame(now) {
    if (!running) return;
    const elapsed = Math.min((now - last) / 1000, STEP * MAX_STEPS);
    last = now;
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      if (target && target.update) target.update(STEP);
      if (Park.engine.input) Park.engine.input.afterStep();
      accumulator -= STEP;
      steps += 1;
    }
    if (target && target.render) target.render(accumulator / STEP);
    requestAnimationFrame(frame);
  }

  Park.engine.loop = {
    step: STEP,
    setTarget(next) { target = next; },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    },
    stop() { running = false; }
  };
})();
