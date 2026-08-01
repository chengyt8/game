// @owner codex
// 第 1 关 · 入口广场（白天）
// 教学：移动、跳跃、跳跃缓冲与边缘宽容；终点前自然拿到空中冲刺。
// 数据契约：ARCHITECTURE.md §6。主路线宽容，高技巧支路只承载彩豆与秘密。
ParkContent.levels.level1 = {
  id: 'level1',
  title: '入口广场',
  theme: 'day',
  size: { w: 72, h: 12 },
  spawn: { x: 2.5, y: 9 },
  checkpoint: { id: 'mid', x: 42, y: 8 },
  exit: { x: 69, y: 8, w: 1, h: 2 },
  unlockDashAt: { x: 61.5, y: 8 },
  platforms: [
    // 三段地面 + 两个 3 格宽的空隙（容错高，直接跳得过去）
    { id: 'ground-a', type: 'solid', x: 0, y: 10, w: 14, h: 2 },
    { id: 'step-a',   type: 'solid', x: 15, y: 8, w: 2, h: 1 },
    { id: 'ground-b', type: 'solid', x: 17, y: 10, w: 14, h: 2 },
    { id: 'ground-c', type: 'solid', x: 34, y: 10, w: 17, h: 2 },
    { id: 'ground-d', type: 'solid', x: 54, y: 10, w: 17, h: 2 },
    // 竖向往返的升降台：载玩家去高处彩豆
    { id: 'lift-a', type: 'moving', x: 22, y: 7, w: 3, h: 0.5,
      motion: { axis: 'y', distance: 2, speed: 1.2 } }
  ],
  hazards: [
    // L1 是纯移动跳跃教学关，不设尖刺（水水实玩反馈：存档点后尖刺+空隙连跳太紧）
    // 尖刺由 L2 / L3 承担
  ],
  springs: [
    // 弹上去够到高处的彩豆，也能进入上方秘密区域
    { id: 'spring-a', x: 30.5, y: 9.5, strength: 820 }
  ],
  collectibles: [
    { id: 'bean-01', x: 5.5,  y: 8.5 },
    { id: 'bean-02', x: 16,   y: 7 },      // 跨越第一处空隙的落脚石上方
    { id: 'bean-03', x: 23.5, y: 4.5 },    // 升降台带到高处
    { id: 'bean-04', x: 30.5, y: 7.5 },    // 弹簧弹起后够到
    { id: 'bean-05', x: 38,   y: 8 },
    { id: 'bean-06', x: 46.5, y: 8 },      // 尖刺正上方
    { id: 'bean-07', x: 49.5, y: 8 },
    { id: 'bean-08', x: 58,   y: 8 },
    { id: 'bean-09', x: 63.5, y: 8 },
    { id: 'bean-10', x: 30,   y: 6 },      // 秘密区域里
    { id: 'bean-11', x: 32.5, y: 6 }       // 秘密区域里
  ],
  secrets: [
    // 弹簧正上方的藏宝区：进入即算「发现秘密」
    { id: 'secret-01', x: 28, y: 5, w: 7, h: 3 }
  ],
  enemies: [],
  signs: [
    { id: 'move-tip', x: 3, y: 8, text: '向前走走看' },
    { id: 'dash-tip', x: 60, y: 8, text: '终点就在前面，有个小惊喜' }
  ]
};
