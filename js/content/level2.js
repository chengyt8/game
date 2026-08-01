// @owner codex
// 第 2 关 · 云上步道（多云）
// 教学：开局用空中冲刺跨越无保底缺口；支路（弹簧 + 高架）加入「冲刺后接跳」的秘密彩豆。
// 首个缺口失败会坠落，其余主路线空隙保留垫脚石；冲刺还能打开高架支路。
ParkContent.levels.level2 = {
  id: 'level2',
  title: '云上步道',
  theme: 'cloud',
  size: { w: 84, h: 14 },
  spawn: { x: 2.5, y: 11 },
  checkpoint: { id: 'mid', x: 30, y: 10 },
  exit: { x: 80, y: 10, w: 1, h: 2 },
  platforms: [
    // 六个主岛；首个 5 格空隙无保底，后续空隙用垫脚石控制难度
    { id: 'island-a', type: 'solid', x: 0,  y: 12, w: 10, h: 2 },
    { id: 'island-b', type: 'solid', x: 15, y: 12, w: 8,  h: 2 },
    { id: 'stone-b',  type: 'solid', x: 24, y: 13, w: 3,  h: 1 },
    { id: 'island-c', type: 'solid', x: 28, y: 12, w: 8,  h: 2 },
    { id: 'stone-c',  type: 'solid', x: 37, y: 13, w: 3,  h: 1 },
    { id: 'island-d', type: 'solid', x: 41, y: 12, w: 8,  h: 2 },
    { id: 'stone-d',  type: 'solid', x: 50, y: 13, w: 3,  h: 1 },
    { id: 'island-e', type: 'solid', x: 54, y: 12, w: 8,  h: 2 },
    { id: 'stone-e',  type: 'solid', x: 63, y: 13, w: 3,  h: 1 },
    { id: 'island-f', type: 'solid', x: 67, y: 12, w: 16, h: 2 },
    // 高架支路：弹簧弹上来，两座平台之间 5 格空隙要冲刺
    { id: 'high-a', type: 'solid', x: 42, y: 8, w: 5, h: 1 },
    { id: 'high-b', type: 'solid', x: 52, y: 8, w: 4, h: 1 }
  ],
  hazards: [
    { id: 'spikes-e', type: 'spikes', x: 56, y: 11.5, w: 3, h: 0.5 }
  ],
  springs: [
    { id: 'spring-d', x: 44.5, y: 11.5, strength: 850 }
  ],
  collectibles: [
    { id: 'bean-01', x: 5,    y: 11 },
    { id: 'bean-02', x: 18,   y: 10 },
    { id: 'bean-03', x: 25.5, y: 11.5 },
    { id: 'bean-04', x: 32,   y: 11 },
    { id: 'bean-05', x: 38.5, y: 11.5 },
    { id: 'bean-06', x: 45,   y: 11 },
    { id: 'bean-07', x: 51.5, y: 11.5 },
    { id: 'bean-08', x: 54,   y: 6 },   // 高架支路：冲刺后落地再跳
    { id: 'bean-09', x: 58,   y: 11 },
    { id: 'bean-10', x: 64.5, y: 11.5 },
    { id: 'bean-11', x: 75,   y: 11 },
    { id: 'bean-12', x: 43.5, y: 6.5 }, // 秘密区域
    { id: 'bean-13', x: 46,   y: 6.5 }, // 秘密区域
    { id: 'bean-14', x: 44.5, y: 7 }    // 弹簧弹起路径上，一眼看到「踩弹簧→飞上去接彩豆」
  ],
  secrets: [
    { id: 'secret-01', x: 41, y: 6, w: 15, h: 2 }
  ],
  enemies: [],
  signs: [
    { id: 'dash-tip', x: 7, y: 11, text: '前面的长空隙，试试空中冲刺' },
    { id: 'spring-tip', x: 43, y: 11, text: '踩弹簧，飞上去有惊喜' }
  ]
};
