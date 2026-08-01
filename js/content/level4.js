// @owner codex
// 第 4 关 · 齿轮工坊（黄昏）
// 精确跳跃：尖刺走廊 + 移动平台躲尖刺 + 弹簧高架秘密。
// 主路线空隙都是 3 格、可直接跳过；难度来自尖刺与平台的组合。
ParkContent.levels.level4 = {
  id: 'level4',
  title: '齿轮工坊',
  theme: 'dusk',
  size: { w: 84, h: 14 },
  spawn: { x: 2.5, y: 11 },
  checkpoint: { id: 'mid', x: 28, y: 10 },
  exit: { x: 80, y: 10, w: 1, h: 2 },
  platforms: [
    { id: 'ground-a', type: 'solid', x: 0,  y: 12, w: 19, h: 2 },
    { id: 'ground-b', type: 'solid', x: 22, y: 12, w: 12, h: 2 },
    { id: 'ground-c', type: 'solid', x: 37, y: 12, w: 15, h: 2 },
    { id: 'ground-d', type: 'solid', x: 55, y: 12, w: 28, h: 2 },
    // 水平移动平台：载玩家越过 6 格宽的尖刺带（跳不过去，必须乘平台）
    { id: 'lift-m', type: 'moving', x: 40, y: 10, w: 3, h: 0.5,
      motion: { axis: 'x', distance: 8, speed: 1.6 } },
    // 弹簧高架：秘密区域
    { id: 'high-a', type: 'solid', x: 58, y: 8, w: 4, h: 1 },
    { id: 'high-b', type: 'solid', x: 66, y: 8, w: 4, h: 1 }
  ],
  hazards: [
    // 尖刺走廊：两段 2 格尖刺 + 一段 3 格尖刺，逼你精确起跳
    { id: 'spikes-a1', type: 'spikes', x: 5,  y: 11.5, w: 2, h: 0.5 },
    { id: 'spikes-a2', type: 'spikes', x: 12, y: 11.5, w: 2, h: 0.5 },
    { id: 'spikes-b',  type: 'spikes', x: 25, y: 11.5, w: 3, h: 0.5 },
    // 6 格宽尖刺带：配合移动平台
    { id: 'spikes-c',  type: 'spikes', x: 40, y: 11.5, w: 6, h: 0.5 }
  ],
  springs: [
    { id: 'spring-d', x: 60, y: 11.5, strength: 880 }
  ],
  collectibles: [
    { id: 'bean-01', x: 2.5, y: 11 },
    { id: 'bean-02', x: 10,  y: 9.5 },
    { id: 'bean-03', x: 16.5, y: 11 },
    { id: 'bean-04', x: 26.5, y: 10 },
    { id: 'bean-05', x: 28,  y: 10.5 },
    { id: 'bean-06', x: 37,  y: 11 },
    { id: 'bean-07', x: 41,  y: 8 },    // 乘移动平台时跳起来拿
    { id: 'bean-08', x: 60,  y: 7 },    // 弹簧弹起路径上
    { id: 'bean-09', x: 68,  y: 7 },    // 高架冲刺后落地再跳
    { id: 'bean-10', x: 58,  y: 11 },
    { id: 'bean-11', x: 63,  y: 11 },
    { id: 'bean-12', x: 70,  y: 11 },
    { id: 'bean-13', x: 76,  y: 11 },
    { id: 'bean-14', x: 59.5, y: 6.5 }, // 秘密区域
    { id: 'bean-15', x: 63,  y: 6.5 }   // 秘密区域
  ],
  secrets: [
    { id: 'secret-01', x: 57, y: 6, w: 14, h: 2 }
  ],
  enemies: [],
  signs: [
    { id: 'precise-tip', x: 3,  y: 11, text: '地上有尖刺，跳准一点' },
    { id: 'ride-tip',    x: 41, y: 11, text: '搭这个平台躲开尖刺' },
    { id: 'secret-tip',  x: 58, y: 11, text: '上面好像有好东西' }
  ]
};
