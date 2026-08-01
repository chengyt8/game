// @owner codex
// 无尽模式「无尽坠落」浮动楼梯数据。
// 16 列格网；每层直接声明独立平台，平台可静止、水平往返并携带尖刺和彩球。
// platform: { x, w, motion?: { distance, speed, phase }, spikes?: [{ offset, w }] }
// bean: { platform, offset }，platform 是本层平台下标，offset 是平台内格坐标。
ParkContent.modes = ParkContent.modes || {};
ParkContent.modes.endless = {
  id: 'endless',
  title: '无尽坠落',
  unlockAfterLevel: 'level1',
  speed: { initial: 42, increasePerSecond: 1.35, max: 150 },
  scoring: { survivalPerSecond: 5, beanPoints: 40 },
  segments: [
    // S1：宽平台慢慢把落点从左带到中间。
    { id: 'seg-a', height: 12, rows: [
      { y: 0, platforms: [{ x: 2, w: 6 }], beans: [{ platform: 0, offset: 4 }] },
      { y: 3, platforms: [{ x: 5, w: 6 }], beans: [{ platform: 0, offset: 3 }] },
      { y: 6, platforms: [{ x: 8, w: 6 }] },
      { y: 9, platforms: [{ x: 4, w: 6, motion: { distance: 3, speed: 45, phase: 0.2 } }],
        beans: [{ platform: 0, offset: 2 }] }
    ] },
    // S2：第一次双落点、电梯和单格尖刺。
    { id: 'seg-b', height: 15, rows: [
      { y: 0, platforms: [{ x: 1, w: 5 }, { x: 9, w: 5 }], beans: [{ platform: 1, offset: 2 }] },
      { y: 3, platforms: [{ x: 5, w: 6, spikes: [{ offset: 4, w: 1 }] }],
        beans: [{ platform: 0, offset: 1 }] },
      { y: 6, platforms: [{ x: 2, w: 5, motion: { distance: 6, speed: 50, phase: 0.8 } }],
        beans: [{ platform: 0, offset: 2 }] },
      { y: 9, platforms: [{ x: 9, w: 5 }] },
      { y: 12, platforms: [{ x: 5, w: 6 }], beans: [{ platform: 0, offset: 4 }] }
    ] },
    // S3：左右选择，中段电梯带着尖刺一起移动。
    { id: 'seg-c', height: 15, rows: [
      { y: 0, platforms: [{ x: 5, w: 6 }] },
      { y: 3, platforms: [{ x: 1, w: 6, spikes: [{ offset: 0, w: 1 }] }],
        beans: [{ platform: 0, offset: 4 }] },
      { y: 6, platforms: [{ x: 2, w: 4 }, { x: 10, w: 4 }],
        beans: [{ platform: 0, offset: 2 }, { platform: 1, offset: 1 }] },
      { y: 9, platforms: [{ x: 3, w: 5, motion: { distance: 5, speed: 60, phase: 1.2 }, spikes: [{ offset: 3, w: 1 }] }] },
      { y: 12, platforms: [{ x: 6, w: 5 }], beans: [{ platform: 0, offset: 2 }] }
    ] },
    // S4：加入 4 格纵距，给玩家一次较长的空中调整。
    { id: 'seg-d', height: 16, rows: [
      { y: 0, platforms: [{ x: 9, w: 5 }], beans: [{ platform: 0, offset: 3 }] },
      { y: 3, platforms: [{ x: 1, w: 5, motion: { distance: 8, speed: 65, phase: 0.4 } }],
        beans: [{ platform: 0, offset: 1 }] },
      { y: 7, platforms: [{ x: 5, w: 6, spikes: [{ offset: 2, w: 1 }] }],
        beans: [{ platform: 0, offset: 4 }] },
      { y: 10, platforms: [{ x: 0, w: 4 }, { x: 8, w: 5 }] },
      { y: 13, platforms: [{ x: 5, w: 6 }], beans: [{ platform: 0, offset: 2 }] }
    ] },
    // S5：静态落点与速度更高的横向电梯交替。
    { id: 'seg-e', height: 18, rows: [
      { y: 0, platforms: [{ x: 5, w: 6 }] },
      { y: 3, platforms: [{ x: 1, w: 4 }, { x: 10, w: 5, spikes: [{ offset: 3, w: 1 }] }],
        beans: [{ platform: 0, offset: 2 }] },
      { y: 6, platforms: [{ x: 4, w: 5, motion: { distance: 5, speed: 72, phase: 1.5 } }],
        beans: [{ platform: 0, offset: 2 }] },
      { y: 9, platforms: [{ x: 9, w: 6 }] },
      { y: 12, platforms: [{ x: 1, w: 6, spikes: [{ offset: 4, w: 1 }] }],
        beans: [{ platform: 0, offset: 2 }] },
      { y: 15, platforms: [{ x: 5, w: 6 }], beans: [{ platform: 0, offset: 4 }] }
    ] },
    // S6：综合段，循环回 S1 时仍保留 2 格纵距。
    { id: 'seg-f', height: 19, rows: [
      { y: 0, platforms: [{ x: 5, w: 6 }] },
      { y: 3, platforms: [{ x: 2, w: 5, motion: { distance: 7, speed: 80, phase: 0.9 } }],
        beans: [{ platform: 0, offset: 3 }] },
      { y: 6, platforms: [{ x: 0, w: 5 }, { x: 9, w: 5, spikes: [{ offset: 1, w: 1 }] }],
        beans: [{ platform: 0, offset: 2 }] },
      { y: 10, platforms: [{ x: 5, w: 6, spikes: [{ offset: 4, w: 1 }] }],
        beans: [{ platform: 0, offset: 1 }] },
      { y: 13, platforms: [{ x: 2, w: 6 }] },
      { y: 16, platforms: [{ x: 5, w: 6 }], beans: [{ platform: 0, offset: 3 }] }
    ] }
  ]
};
