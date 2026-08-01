// @owner codex
// 第 5 关 · 不夜城（夜晚 · 终章）
// 组合考验：两只巡逻敌人 + 尖刺 + 移动平台 + 弹簧高架秘密 + 冲刺。
ParkContent.levels.level5 = {
  id: 'level5',
  title: '不夜城',
  theme: 'night',
  size: { w: 84, h: 14 },
  spawn: { x: 2.5, y: 11 },
  checkpoint: { id: 'mid', x: 28, y: 10 },
  exit: { x: 80, y: 10, w: 1, h: 2 },
  platforms: [
    { id: 'ground-a', type: 'solid', x: 0,  y: 12, w: 18, h: 2 },
    { id: 'ground-b', type: 'solid', x: 21, y: 12, w: 12, h: 2 },
    { id: 'ground-c', type: 'solid', x: 36, y: 12, w: 14, h: 2 },
    { id: 'ground-d', type: 'solid', x: 53, y: 12, w: 12, h: 2 },
    { id: 'ground-e', type: 'solid', x: 68, y: 12, w: 15, h: 2 },
    // 终段：水平移动平台载玩家越过 6 格尖刺带
    { id: 'lift-b', type: 'moving', x: 72, y: 10, w: 3, h: 0.5,
      motion: { axis: 'x', distance: 8, speed: 1.6 } },
    // 弹簧高架：秘密区域
    { id: 'high-a', type: 'solid', x: 44, y: 8, w: 4, h: 1 },
    { id: 'high-b', type: 'solid', x: 52, y: 8, w: 4, h: 1 }
  ],
  hazards: [
    { id: 'spikes-b', type: 'spikes', x: 25, y: 11.5, w: 2, h: 0.5 },
    { id: 'spikes-d', type: 'spikes', x: 62, y: 11.5, w: 2, h: 0.5 }, // 和第二只敌人同段
    { id: 'spikes-e', type: 'spikes', x: 72, y: 11.5, w: 6, h: 0.5 }
  ],
  springs: [
    { id: 'spring-c', x: 46, y: 11.5, strength: 880 }
  ],
  collectibles: [
    { id: 'bean-01', x: 5,   y: 11 },
    { id: 'bean-02', x: 14,  y: 10 },
    { id: 'bean-03', x: 24,  y: 11 },
    { id: 'bean-04', x: 26.5, y: 10 },  // 尖刺正上方
    { id: 'bean-05', x: 38,  y: 11 },
    { id: 'bean-06', x: 46.5, y: 7 },   // 弹簧弹起路径上
    { id: 'bean-07', x: 54,  y: 6 },    // 高架冲刺后落地再跳
    { id: 'bean-08', x: 50,  y: 11 },
    { id: 'bean-09', x: 58,  y: 11 },
    { id: 'bean-10', x: 64,  y: 10 },   // 尖刺正上方
    { id: 'bean-11', x: 72,  y: 11 },
    { id: 'bean-12', x: 77,  y: 11 },
    { id: 'bean-13', x: 46,  y: 6.5 },  // 秘密区域
    { id: 'bean-14', x: 49,  y: 6.5 }   // 秘密区域
  ],
  secrets: [
    { id: 'secret-01', x: 43, y: 6, w: 14, h: 2 }
  ],
  enemies: [
    { id: 'walker-01', type: 'walker', x: 8,  y: 11, patrol: 6, speed: 85 },
    { id: 'walker-02', type: 'walker', x: 60, y: 11, patrol: 5, speed: 90 }
  ],
  signs: [
    { id: 'walker-tip', x: 4,  y: 11, text: '两个巡逻的家伙，小心' },
    { id: 'ride-tip',   x: 71, y: 11, text: '平台会带你过去' },
    { id: 'finale-tip', x: 76, y: 11, text: '最后一段，点亮它' }
  ]
};
