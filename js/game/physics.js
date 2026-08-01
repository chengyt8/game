// @owner codex
(function () {
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function approach(value, target, amount) {
    if (value < target) return Math.min(value + amount, target);
    return Math.max(value - amount, target);
  }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function pointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }
  function snapDashDirection(x, y, facing) {
    if (!x && !y) return { x: facing || 1, y: 0 };
    const angle = Math.atan2(y, x);
    const step = Math.PI / 4;
    const snapped = Math.round(angle / step) * step;
    const sx = Math.cos(snapped);
    const sy = Math.sin(snapped);
    return {
      x: Math.abs(sx) < 0.01 ? 0 : Math.abs(sx) > 0.99 ? Math.sign(sx) : Math.sign(sx) / Math.sqrt(2),
      y: Math.abs(sy) < 0.01 ? 0 : Math.abs(sy) > 0.99 ? Math.sign(sy) : Math.sign(sy) / Math.sqrt(2)
    };
  }

  Park.game.physics = { clamp, approach, overlap, pointInRect, snapDashDirection };
})();
