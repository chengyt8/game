// @owner codex
// 第 3 关 · 摩天轮之夜（夜晚）
// 组合：垂直/水平移动平台 + 弹簧高架 + 唯一一只可踩踏的笨敌人；终点点亮摩天轮。
ParkContent.levels.level3 = {
  id: 'level3',
  title: '摩天轮之夜',
  theme: 'night',
  size: { w: 84, h: 14 },
  spawn: { x: 2.5, y: 11 },
  checkpoint: { id: 'mid', x: 36, y: 10 },
  exit: { x: 79, y: 10, w: 1, h: 2 },
  platforms: [
    { id: 'ground-a', type: 'solid', x: 0,  y: 12, w: 16, h: 2 },
    { id: 'ground-b', type: 'solid', x: 20, y: 12, w: 12, h: 2 },
    { id: 'ground-c', type: 'solid', x: 35, y: 12, w: 14, h: 2 },
    { id: 'ground-d', type: 'solid', x: 52, y: 12, w: 8,  h: 2 },
    { id: 'ground-e', type: 'solid', x: 66, y: 12, w: 17, h: 2 },
    // 垂直升降台：载玩家跨过第一处空隙、够到高处彩豆
    { id: 'lift-a', type: 'moving', x: 18, y: 10, w: 3, h: 0.5,
      motion: { axis: 'y', distance: 2, speed: 1.3 } },
    // 水平往返台：载玩家跨过 6 格大空隙
    { id: 'lift-b', type: 'moving', x: 63, y: 10, w: 3, h: 0.5,
      motion: { axis: 'x', distance: 4, speed: 1.5 } },
    // 弹簧高架：秘密区域所在（high-a 对齐弹簧正上方，弹起即落上）
    { id: 'high-a', type: 'solid', x: 44, y: 8, w: 5, h: 1 },
    { id: 'high-b', type: 'solid', x: 52, y: 8, w: 4, h: 1 }
  ],
  hazards: [
    { id: 'spikes-c', type: 'spikes', x: 43, y: 11.5, w: 3, h: 0.5 }
  ],
  springs: [
    // 对齐在 high-a 正下方（x46.5），弹起即可落上高架；强度 880 保证够高
    { id: 'spring-c', x: 46.5, y: 11.5, strength: 880 }
  ],
  collectibles: [
    { id: 'bean-01', x: 5,    y: 11 },
    { id: 'bean-02', x: 19.5, y: 8.5 },   // 乘升降台上到高处
    { id: 'bean-03', x: 23,   y: 11 },
    { id: 'bean-04', x: 27,   y: 10 },     // 巡逻敌人的正上方
    { id: 'bean-05', x: 37,   y: 11 },
    { id: 'bean-06', x: 44.5, y: 11 },     // 尖刺正上方
    { id: 'bean-07', x: 46.5, y: 7 },      // 弹簧弹起路径上，一眼看到
    { id: 'bean-08', x: 54,   y: 6 },      // 高架冲刺后落地再跳
    { id: 'bean-09', x: 55,   y: 11 },
    { id: 'bean-10', x: 58.5, y: 10 },
    { id: 'bean-11', x: 70,   y: 11 },
    { id: 'bean-12', x: 76,   y: 10 },
    { id: 'bean-13', x: 46,   y: 6.5 },    // 秘密区域
    { id: 'bean-14', x: 51,   y: 6.5 }     // 秘密区域
  ],
  secrets: [
    { id: 'secret-01', x: 43, y: 6, w: 14, h: 2 }
  ],
  enemies: [
    { id: 'walker-01', type: 'walker', x: 26, y: 11, patrol: 4, speed: 70 }
  ],
  signs: [
    { id: 'walker-tip', x: 21, y: 11, text: '前面有个巡逻的家伙，从上面踩它' },
    { id: 'lift-tip',   x: 56, y: 11, text: '搭这个平台过去' },
    { id: 'finale-tip', x: 76, y: 11, text: '终点就在前面，把摩天轮点亮' }
  ]
};
