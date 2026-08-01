// @owner codex
// 内容根：ARCHITECTURE.md §3 / §7 契约
// 调色板 / 主题 / 关卡顺序在此登记；主题只描述语义颜色，不含绘制函数。
window.ParkContent = {
  version: 1,
  levelOrder: ['level1', 'level2', 'level3', 'level4', 'level5'],
  palette: {},
  themes: {
    // L1 入口广场：白天
    day: {
      sky: '#8ED7E8', haze: '#F6E7A7', terrain: '#355A47',
      terrainTop: '#73B66B', accent: '#F4C84A', danger: '#D94B45', ink: '#20242A'
    },
    // L2 云上步道：多云
    cloud: {
      sky: '#B7D6EA', haze: '#E8F0F5', terrain: '#4A6B8A',
      terrainTop: '#8FB8D8', accent: '#E8B84A', danger: '#D94B45', ink: '#1E2A33'
    },
    // L3 摩天轮之夜：夜晚
    night: {
      sky: '#1B2440', haze: '#3A4A7A', terrain: '#2A3550',
      terrainTop: '#6A7FC0', accent: '#F4C84A', danger: '#E0574F', ink: '#EAF0FF'
    },
    // L4 齿轮工坊：黄昏
    dusk: {
      sky: '#F2B883', haze: '#8E6A9E', terrain: '#4A3A6B',
      terrainTop: '#A9778F', accent: '#F4C84A', danger: '#D94B45', ink: '#2A2433'
    }
  },
  sprites: {},
  levels: {}
};
