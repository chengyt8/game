// @owner codex
(function () {
  try {
    const content = Park.game.contentLoader.load();
    const app = new Park.game.App(content);
    Park.game.app = app;
    Park.engine.loop.setTarget(app);
    Park.engine.loop.start();
  } catch (error) {
    console.error(error);
    const overlay = document.getElementById('overlay');
    document.getElementById('overlay-title').textContent = '乐园暂未开放';
    document.getElementById('overlay-copy').textContent = error.message;
    document.getElementById('overlay-actions').replaceChildren();
    overlay.classList.add('is-visible');
  }
})();
