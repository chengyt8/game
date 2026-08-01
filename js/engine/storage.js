// @owner codex
(function () {
  const KEY = 'park-cow-adventure:v1';
  const defaults = {
    version: 1,
    settings: { muted: false },
    progress: {
      dashUnlocked: false,
      unlockedLevel: 1,
      bestStars: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
      bestEndlessScore: 0
    }
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function load(levelOrder) {
    const result = clone(defaults);
    const levelIds = Array.isArray(levelOrder) && levelOrder.length
      ? levelOrder
      : Object.keys(result.progress.bestStars);
    result.progress.bestStars = Object.fromEntries(levelIds.map((id) => [id, 0]));
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!parsed || parsed.version !== 1) return result;
      if (typeof parsed.settings?.muted === 'boolean') result.settings.muted = parsed.settings.muted;
      if (typeof parsed.progress?.dashUnlocked === 'boolean') result.progress.dashUnlocked = parsed.progress.dashUnlocked;
      if (Number.isInteger(parsed.progress?.unlockedLevel)) {
        result.progress.unlockedLevel = Math.max(1, Math.min(levelIds.length, parsed.progress.unlockedLevel));
      }
      if (Number.isInteger(parsed.progress?.bestEndlessScore)) {
        result.progress.bestEndlessScore = Math.max(0, parsed.progress.bestEndlessScore);
      }
      for (const id of Object.keys(result.progress.bestStars)) {
        const stars = parsed.progress?.bestStars?.[id];
        if (Number.isInteger(stars)) result.progress.bestStars[id] = Math.max(0, Math.min(3, stars));
      }
    } catch (_) { /* Persistence is optional. */ }
    return result;
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (_) { return false; }
  }

  Park.engine.storage = { KEY, defaults: clone(defaults), load, save };
})();
