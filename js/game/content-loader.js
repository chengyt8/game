// @owner codex
(function () {
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function assert(condition, message) { if (!condition) throw new Error(`内容错误：${message}`); }

  function load() {
    const content = clone(window.ParkContent || {});
    assert(content.version === 1, 'version 必须为 1');
    assert(Array.isArray(content.levelOrder) && content.levelOrder.length >= 3, 'levelOrder 必须至少包含三关');
    assert(new Set(content.levelOrder).size === content.levelOrder.length, 'levelOrder 不能包含重复关卡');
    assert(content.sprites?.cow, '缺少 cow 精灵');
    assert(content.modes?.endless, '缺少无尽坠落内容');
    content.levelOrder.forEach((id) => assert(content.levels?.[id], `缺少关卡 ${id}`));
    Park.content = content;
    return content;
  }

  Park.game.contentLoader = { load };
})();
