# 乐园小游戏 · 技术架构

> 状态：五关版本已实现
> 唯一写者：Codex（技术架构与集成负责人）
> 依据：`GAME_DESIGN.md` 与 `RESPONSIBILITIES.md`

## 1. 技术目标

- 原生 HTML、CSS、JavaScript 与 Canvas 2D，不依赖 CDN、网络请求或远程字体。
- 直接双击 `index.html` 即可从 `file://` 运行；不要求安装依赖或启动服务器。
- 键盘与多点触屏共用一套语义输入，manifest 登记的关卡均可通关。
- 固定时间步推进物理，保证不同刷新率下手感一致。
- 玩法内容只通过 `js/content/*` 注册数据；增加关卡或精灵不修改引擎核心。
- `localStorage` 只保存设置、解锁进度和每关最高星级；存储不可用时仍可完整游玩。

## 2. 文件与所有权

```text
乐园小游戏/
├── index.html                         # Codex：离线入口与可访问控件
├── css/game.css                       # Codex：画布、HUD、触屏控制与响应式
├── js/
│   ├── engine/                        # Codex：稳定、与具体关卡无关
│   │   ├── loop.js                    # 固定时间步与场景调度
│   │   ├── input.js                   # 键盘/Pointer Events → 语义动作
│   │   ├── audio.js                   # Web Audio 合成音效与静音
│   │   ├── storage.js                 # localStorage 容错封装
│   │   └── renderer.js                # Canvas、相机、拼豆精灵与粒子绘制
│   ├── game/                          # Codex：本游戏唯一运行时实现
│   │   ├── content-loader.js          # 数据校验、索引与只读访问
│   │   ├── physics.js                 # AABB、移动平台、玩家运动
│   │   ├── world.js                   # 实体创建、触发器、收集与重生
│   │   ├── scenes.js                  # 菜单/游玩/暂停/结算状态
│   │   └── main.js                    # 启动、系统连接与事件订阅
│   └── content/                       # cc：只含数据，不含运行时逻辑
│       ├── manifest.js                # 内容根、调色板、主题、关卡顺序
│       ├── cow.js                     # 主角拼豆网格
│       ├── level1.js … level5.js       # 每关一个数据文件
├── tools/validate-content.mjs         # Codex：静态校验内容契约
└── tests/                             # Codex：逻辑与浏览器验证
```

所有浏览器脚本使用传统 `<script>` 同步加载；关卡文件名由 manifest 的 `levelOrder` 推导，不使用 ES Modules，也不在运行时 `fetch` 文件。Node 工具可使用 `.mjs`，但不参与玩家运行游戏。

## 3. 全局边界与加载顺序

运行时只暴露一个命名空间：

```js
window.Park = {
  content: null,
  engine: {},
  game: {}
};
```

加载顺序固定为：命名空间 → `manifest.js` → 精灵与关卡内容 → engine → game → `main.js`。内容文件只能写 `window.ParkContent`，不能调用引擎函数或读取 DOM。

`manifest.js` 初始化唯一内容根：

```js
// @owner codex
window.ParkContent = {
  version: 1,
  levelOrder: ['level1', 'level2', 'level3', 'level4', 'level5'],
  palette: {},
  themes: {},
  sprites: {},
  levels: {}
};
```

其余内容文件只向对应字典添加一个唯一键。运行时加载后进行深复制并校验，不会修改注册阶段的原始对象。

## 4. 坐标与通用约定

- 逻辑画布：`960 × 540`；CSS 等比缩放，内部坐标不随设备变化。
- 世界坐标单位：像素；关卡布局使用格子，`tileSize` 固定为 `48` 像素。
- 所有矩形 `{ x, y, w, h }` 均以格子为单位，`x/y` 是左上角。
- 点实体 `{ x, y }` 以格子为单位，表示落脚点中心；加载时转像素。
- 关卡原点在左上，x 向右、y 向下。
- 颜色使用 `#RRGGBB`；可见文字使用简体中文。
- 每个数组内的 `id` 在本关唯一，使用 ASCII 小写短横线形式。

## 5. 精灵数据契约

`cow.js` 只注册拼豆网格，不包含图片 URL：

```js
// @owner codex
ParkContent.sprites.cow = {
  name: '拼豆小牛',
  cellSize: 1,
  palette: {
    K1: '#232321',
    G1: '#3E3E3B'
  },
  grid: [
    [null, 'K1', 'K1'],
    ['G1', 'G1', null]
  ]
};
```

约束：

- `grid` 必须为非空矩形；空格用 `null`，非空值必须存在于精灵自己的 `palette`。
- 四周不得有全空行或全空列，避免碰撞体与视觉中心偏移。
- 运行时按目标高度缩放，并用程序化倾斜、压缩、拉伸和拖影表现动作。
- 精灵碰撞体独立于网格尺寸，由运行时固定，不从非透明像素推断。

## 6. 关卡数据契约

每个 `levelN.js` 注册一个关卡对象：

```js
// @owner codex
ParkContent.levels.level1 = {
  id: 'level1',
  title: '入口广场',
  theme: 'day',
  size: { w: 72, h: 12 },
  spawn: { x: 2.5, y: 9 },
  checkpoint: { id: 'mid', x: 36.5, y: 8 },
  exit: { x: 69, y: 8, w: 1, h: 2 },
  unlockDashAt: { x: 61.5, y: 8 },
  platforms: [
    { id: 'ground-a', type: 'solid', x: 0, y: 10, w: 18, h: 2 },
    { id: 'lift-a', type: 'moving', x: 22, y: 8, w: 3, h: 0.5,
      motion: { axis: 'y', distance: 3, speed: 1.5 } }
  ],
  hazards: [
    { id: 'spikes-a', type: 'spikes', x: 18, y: 9.5, w: 4, h: 0.5 }
  ],
  springs: [
    { id: 'spring-a', x: 28.5, y: 9.5, strength: 820 }
  ],
  collectibles: [
    { id: 'bean-01', x: 5.5, y: 8.5 }
  ],
  secrets: [
    { id: 'secret-01', x: 14, y: 6, w: 5, h: 3 }
  ],
  enemies: [
    { id: 'walker-01', type: 'walker', x: 42.5, y: 9, patrol: 5, speed: 70 }
  ],
  signs: [
    { id: 'move-tip', x: 3, y: 8, text: '向前走走看' }
  ]
};
```

通用约束：

- `id` 必须与字典键一致；`theme` 必须存在于 `manifest.js` 的 `themes`。
- `size.w >= 20`、`size.h >= 8`；所有实体必须落在关卡边界内。
- `spawn`、`checkpoint`、`exit` 必填；每关恰好一个中段存档旗、至少一个秘密区域。
- 彩豆中心与平台顶边落在秘密矩形内时由运行时自动归属该秘密；每个秘密至少包含 2 颗彩豆。发现前对应彩豆与高架不绘制、不拾取、不碰撞；玩家进入触发区后一起揭示到本次重开。
- `platforms` 至少一个；实体数组即使为空也必须存在，避免运行时猜默认值。
- `type: 'solid'` 不含 `motion`；`type: 'moving'` 必须含 `motion`。
- 移动平台 `axis` 只能为 `x` 或 `y`；`distance > 0`，`speed > 0`，运动范围不得越界。
- `hazards.type` 首版只允许 `spikes`；深渊由没有平台且超过 `size.h` 的区域表达。
- `springs.strength > 0`；`collectibles` 至少一个且 ID 唯一。
- 数值单位：`motion.speed` 使用格/秒，`enemies.speed` 与 `springs.strength` 使用像素/秒，`enemies.patrol` 使用格。
- `enemies` 只允许 `walker`；上限为 L1/L2/L4 = 0、L3 = 1、L5 = 2。
- `unlockDashAt` 仅 L1 必填，其余关卡必须省略；存档进度解锁后重玩 L1 仍在该位置触发获得反馈。
- `signs.text` 是关卡内短提示，不写键位说明；运行时根据输入设备显示图标。

L3 的“点亮摩天轮”不增加专用内容字段：运行时根据 `level3` 播放摩天轮表现。manifest 的最后一关会额外获得通用终章灯牌、粒子与结算文案。

内容交付时应让主路线无需秘密技巧即可通关；高技巧路线只承载可选彩豆与秘密。

## 7. 主题数据契约

`manifest.js` 至少定义 `day`、`cloud`、`night`、`dusk` 四个主题：

```js
ParkContent.themes.day = {
  sky: '#8ED7E8',
  haze: '#F6E7A7',
  terrain: '#355A47',
  terrainTop: '#73B66B',
  accent: '#F4C84A',
  danger: '#D94B45',
  ink: '#20242A'
};
```

主题只描述语义颜色，不含绘制函数。整体避免单一色系；危险、可交互物、背景必须可辨。

## 8. 运行时系统

### 主循环与状态

- `requestAnimationFrame` 负责渲染。
- 物理使用 `1/120s` 固定步长，单帧最多补算 8 步，超过部分丢弃以避免切后台后追帧。
- 场景状态：关卡使用 `menu → playing ↔ paused → complete`；无尽模式使用 `menu → endless ↔ paused → endless-complete`。
- 玩家死亡是 `playing` 内部的短状态：冻结输入、播放反馈、在 1 秒内恢复到最近存档旗。

### 输入

输入层统一输出：`moveX`、`moveY`、`jumpDown`、`jumpPressed`、`jumpReleased`、`dashPressed`、`restartPressed`、`pausePressed`、`mutePressed`。

- 键盘和 Pointer Events 可同时存在；同一语义动作取强度较大的输入。
- 触屏按钮使用稳定尺寸和 `touch-action: none`，支持同时按方向与跳/冲刺。
- 失焦、页面隐藏、`pointercancel` 时清空输入，避免按键粘住。

### 物理与碰撞

- 玩家、敌人和平台使用 AABB；玩家先沿 x、再沿 y 解算静态碰撞。
- 移动平台先更新，再把站立玩家带上平台，最后解算玩家主动速度。
- 土狼时间、跳跃缓冲与冲刺次数均使用秒计时器，不绑定帧数。
- 冲刺期间锁定方向和速度；结束后恢复重力与空中操控。
- 踩踏判定要求玩家上一帧底部不低于敌人顶部容差，且当前垂直速度向下；否则按侧碰重生。

### 相机与表现

- 相机只横向跟随为主，轻微纵向前视；严格限制在关卡边界内。
- 像素网格使用整数缩放与关闭平滑，背景和粒子可使用连续坐标。
- UI 采用 DOM 覆盖层，Canvas 只绘制游戏世界；暂停、星级和按钮不参与相机移动。
- 音效由 Web Audio 即时合成；首次用户操作后恢复音频上下文。

## 9. 存档契约

键名：`park-cow-adventure:v1`。

```js
{
  version: 1,
  settings: { muted: false },
  progress: {
    dashUnlocked: false,
    unlockedLevel: 1,
    bestStars: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
    bestEndlessScore: 0
  }
}
```

读取时逐字段校验，并按当前 `levelOrder` 初始化星级表与限制解锁上限；JSON 损坏、隐私模式或存储配额错误只禁用持久化，不阻止游戏。关卡内临时收集状态只存内存，重开本关时清空，死亡重生时保留。

## 10. 校验与验收

### 内容静态校验

`tools/validate-content.mjs` 通过 Node `vm` 在隔离上下文加载内容脚本，检查第 5–7 节及无尽段落契约，并输出每个关卡的实体数量、段落衔接、边界错误和重复 ID。内容数据通过后才集成。

### 技术验证

- 逻辑测试：输入状态、计时器、存档容错、AABB、跳跃缓冲、土狼时间、冲刺重置、踩踏判定。
- 浏览器验证：本地 HTTP 与 `file://` 各启动一次；检查控制台零错误。
- 桌面视口：`1440×900`、`1280×720`；移动视口：`390×844`、`844×390`。
- 实际通关：键盘和触屏均覆盖 L1–L5；L2 单独检查斜向冲刺；无尽模式检查速度、计分、冲刺重置、结算与重开。
- Canvas 像素检查：非空、相机边界稳定、主角/终点/危险可见，DOM 控件无重叠。

### 交接给 cc 的验收输入

Codex 提供可直接打开的 `index.html`、技术验证结果和已知限制。cc 按 `GAME_DESIGN.md` 第 10 节体验验收，只提交分级问题与期望表现，不直接修改运行时。

## 11. 扩展规则

- 新关卡：新增一个内容脚本、在 `levelOrder` 登记；只使用已有实体时不改运行时。
- 新实体类型：先由双方信箱同意范围，再由 Codex 扩充数据契约和运行时；cc 随后提供数据。
- 新角色：增加精灵数据与角色配置；动作能力变更属于玩法范围变更，不能只靠内容绕过协议。
- 新模式：使用独立场景和状态，不在现有关卡对象中堆互斥字段。

### 无尽坠落

- 内容位于 `js/content/endless.js`，运行时位于 `js/game/endless-world.js`，不复用关卡 `World` 的落地、重生与终点语义。
- 段落按 16 列格网纵向拼接；每层直接声明 1–2 块独立浮动平台，相邻层纵距 3–4 格，并保持至少两屏前视数据。
- 相机沿世界 y 轴按内容速度独立推进，所有楼梯持续向上滚动。玩家站立时世界坐标固定，因此会被楼梯推向屏幕顶部；离开平台边缘后由重力向下一层落下。
- 楼梯使用单向承重碰撞：只接住向下运动的玩家，不造成伤害。玩家顶部越过屏幕顶部，或脚部越过屏幕底部时结算。
- 横向电梯使用三角波往返并在每帧先把 `dx` 施加给站立玩家，再叠加玩家自身水平速度，因此同向加速、逆向减速；绑定的尖刺和彩球共享平台位移。
- 彩球以平台下标和平台内偏移绑定，球底与平台顶保持 14px 可见间隔；拾取使用 64×64px 宽容判定，站立与落地使用角色 34×46px 实体盒。
- 尖刺绑定所属平台，随电梯移动并使用独立危险 AABB；平台本体仍可安全站立。
- 无尽跳跃仅在 `standingPlatformId` 有效且脚部仍接触平台时启动；起跳清除承载关系并施加向上速度，重新落地前忽略后续跳跃输入。
- 水平冲刺在落到新楼梯后重置；`↓/S` 仅在离开楼梯后增加下落加速度。
- HUD 分数为 `floor(time × survivalPerSecond + beans × beanPoints)`；`bestEndlessScore` 只在本次得分更高时更新。
