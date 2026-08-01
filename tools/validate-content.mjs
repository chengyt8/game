#!/usr/bin/env node
// @owner codex
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(projectRoot, 'js/content');
const errors = [];
const walkerLimits = { level1: 0, level2: 0, level3: 1, level4: 0, level5: 2 };

function fail(message) { errors.push(message); }
function check(condition, message) { if (!condition) fail(message); }
function isNumber(value) { return typeof value === 'number' && Number.isFinite(value); }
function insidePoint(point, level) {
  return isNumber(point?.x) && isNumber(point?.y) && point.x >= 0 && point.x <= level.size.w && point.y >= 0 && point.y <= level.size.h;
}
function insideRect(rect, level) {
  return isNumber(rect?.x) && isNumber(rect?.y) && isNumber(rect?.w) && isNumber(rect?.h)
    && rect.w > 0 && rect.h > 0 && rect.x >= 0 && rect.y >= 0
    && rect.x + rect.w <= level.size.w && rect.y + rect.h <= level.size.h;
}

const baseFiles = ['manifest.js', 'cow.js'];
for (const file of baseFiles) check(fs.existsSync(path.join(contentDir, file)), `缺少 ${file}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const context = vm.createContext({ window: {} });
try {
  vm.runInContext(fs.readFileSync(path.join(contentDir, 'manifest.js'), 'utf8'), context, { filename: 'manifest.js' });
} catch (error) {
  fail(`manifest.js 语法/加载失败：${error.message}`);
}
context.ParkContent = context.window.ParkContent;

const declaredLevels = context.window.ParkContent?.levelOrder;
check(Array.isArray(declaredLevels) && declaredLevels.length >= 3, 'levelOrder 必须至少包含三关');
check(Array.isArray(declaredLevels) && new Set(declaredLevels).size === declaredLevels.length, 'levelOrder 不能包含重复关卡');
const levelFiles = Array.isArray(declaredLevels) ? declaredLevels.map((id) => `${id}.js`) : [];
const expectedFiles = ['cow.js', ...levelFiles, 'endless.js'];
for (const file of expectedFiles) check(fs.existsSync(path.join(contentDir, file)), `缺少 ${file}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

for (const file of expectedFiles) {
  const source = fs.readFileSync(path.join(contentDir, file), 'utf8');
  try { vm.runInContext(source, context, { filename: file }); } catch (error) { fail(`${file} 语法/加载失败：${error.message}`); }
}

const content = context.window.ParkContent;
check(content?.version === 1, 'manifest version 必须为 1');
check(Array.isArray(content?.levelOrder) && content.levelOrder.length >= 3, 'levelOrder 必须至少包含三关');

const sprite = content?.sprites?.cow;
check(Boolean(sprite), '缺少 cow 精灵');
if (sprite) {
  check(Array.isArray(sprite.grid) && sprite.grid.length > 0, 'cow.grid 必须非空');
  const width = sprite.grid?.[0]?.length || 0;
  check(width > 0 && sprite.grid.every((row) => Array.isArray(row) && row.length === width), 'cow.grid 必须为矩形');
  const known = new Set(Object.keys(sprite.palette || {}));
  sprite.grid.flat().forEach((key) => check(key === null || known.has(key), `cow.grid 出现未知色号 ${key}`));
  check(sprite.grid[0].some(Boolean) && sprite.grid.at(-1).some(Boolean), 'cow.grid 上下不得有全空行');
  check(sprite.grid.some((row) => row[0]) && sprite.grid.some((row) => row.at(-1)), 'cow.grid 左右不得有全空列');
}

for (const id of content?.levelOrder || []) {
  const level = content.levels?.[id];
  if (!level) { fail(`缺少关卡 ${id}`); continue; }
  check(level.id === id, `${id}: id 与字典键不一致`);
  check(Boolean(content.themes?.[level.theme]), `${id}: 未知主题 ${level.theme}`);
  check(isNumber(level.size?.w) && level.size.w >= 20 && isNumber(level.size?.h) && level.size.h >= 8, `${id}: size 至少 20x8`);
  check(insidePoint(level.spawn, level), `${id}: spawn 越界`);
  check(insidePoint(level.checkpoint, level), `${id}: checkpoint 越界`);
  check(insideRect(level.exit, level), `${id}: exit 越界`);

  const arrays = ['platforms', 'hazards', 'springs', 'collectibles', 'secrets', 'enemies', 'signs'];
  arrays.forEach((key) => check(Array.isArray(level[key]), `${id}: ${key} 必须为数组`));
  check(level.platforms?.length > 0, `${id}: 至少一个平台`);
  check(level.collectibles?.length > 0, `${id}: 至少一个彩豆`);
  check(level.secrets?.length > 0, `${id}: 至少一个秘密区域`);

  const all = arrays.flatMap((key) => level[key] || []).concat(level.checkpoint?.id ? [level.checkpoint] : []);
  const ids = new Set();
  for (const item of all) {
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || ''), `${id}: 非法实体 id ${item.id}`);
    check(!ids.has(item.id), `${id}: 重复实体 id ${item.id}`);
    ids.add(item.id);
  }

  (level.platforms || []).forEach((item) => {
    check(insideRect(item, level), `${id}/${item.id}: 平台越界`);
    check(['solid', 'moving'].includes(item.type), `${id}/${item.id}: 非法平台类型`);
    if (item.type === 'moving') {
      check(['x', 'y'].includes(item.motion?.axis) && item.motion.distance > 0 && item.motion.speed > 0, `${id}/${item.id}: 移动参数非法`);
      const end = { ...item };
      end[item.motion.axis] += item.motion.distance;
      check(insideRect(end, level), `${id}/${item.id}: 移动终点越界`);
    } else check(!item.motion, `${id}/${item.id}: 静态平台不应有 motion`);
  });
  (level.hazards || []).forEach((item) => check(item.type === 'spikes' && insideRect(item, level), `${id}/${item.id}: 危险地形非法`));
  (level.springs || []).forEach((item) => check(insidePoint(item, level) && item.strength > 0, `${id}/${item.id}: 弹簧非法`));
  (level.collectibles || []).forEach((item) => check(insidePoint(item, level), `${id}/${item.id}: 彩豆越界`));
  (level.secrets || []).forEach((item) => {
    check(insideRect(item, level), `${id}/${item.id}: 秘密区域越界`);
    const rewards = (level.collectibles || []).filter((bean) => (
      bean.x >= item.x && bean.x <= item.x + item.w
        && bean.y >= item.y && bean.y <= item.y + item.h
    ));
    check(rewards.length >= 2, `${id}/${item.id}: 秘密区域至少需要 2 颗隐藏彩豆`);
  });
  (level.collectibles || []).forEach((bean) => {
    const owners = (level.secrets || []).filter((item) => (
      bean.x >= item.x && bean.x <= item.x + item.w
        && bean.y >= item.y && bean.y <= item.y + item.h
    ));
    check(owners.length <= 1, `${id}/${bean.id}: 彩豆不能同时属于多个秘密区域`);
  });
  (level.signs || []).forEach((item) => check(insidePoint(item, level) && typeof item.text === 'string' && item.text.length > 0, `${id}/${item.id}: 提示牌非法`));

  if (id === 'level1') check(insidePoint(level.unlockDashAt, level), 'level1: unlockDashAt 必填且不能越界');
  else check(level.unlockDashAt === undefined, `${id}: 不应含 unlockDashAt`);
  const walkerLimit = walkerLimits[id] ?? 0;
  check(
    level.enemies.length <= walkerLimit
      && level.enemies.every((item) => item.type === 'walker' && insidePoint(item, level) && item.patrol > 0 && item.speed > 0),
    `${id}: 只允许至多 ${walkerLimit} 个合法 walker`
  );

  console.log(`${id}: ${level.platforms.length} platforms, ${level.collectibles.length} beans, ${level.secrets.length} secrets, ${level.enemies.length} enemies`);
}

const endless = content?.modes?.endless;
check(Boolean(endless), '缺少 modes.endless');
if (endless) {
  check(endless.id === 'endless', 'endless.id 必须为 endless');
  check(typeof endless.title === 'string' && endless.title.length > 0, 'endless.title 必须非空');
  check(content.levelOrder.includes(endless.unlockAfterLevel), 'endless.unlockAfterLevel 必须是已登记关卡');
  check(
    isNumber(endless.speed?.initial) && endless.speed.initial > 0
      && isNumber(endless.speed?.increasePerSecond) && endless.speed.increasePerSecond > 0
      && isNumber(endless.speed?.max) && endless.speed.max >= endless.speed.initial,
    'endless.speed 数值非法'
  );
  check(
    isNumber(endless.scoring?.survivalPerSecond) && endless.scoring.survivalPerSecond > 0
      && isNumber(endless.scoring?.beanPoints) && endless.scoring.beanPoints > 0,
    'endless.scoring 数值非法'
  );
  check(Array.isArray(endless.segments) && endless.segments.length >= 6, 'endless.segments 至少需要 6 段');

  const segmentIds = new Set();
  let segmentStartY = 0;
  let previousWorldRowY = null;
  let platformCount = 0;
  let movingCount = 0;
  let spikeCount = 0;
  let floatingCount = 0;
  let beanCount = 0;
  for (const segment of endless.segments || []) {
    const prefix = `endless/${segment.id || '?'}`;
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment.id || ''), `${prefix}: 非法段落 id`);
    check(!segmentIds.has(segment.id), `${prefix}: 重复段落 id`);
    segmentIds.add(segment.id);
    check(Number.isInteger(segment.height) && segment.height > 0, `${prefix}: height 必须为正整数`);
    check(Array.isArray(segment.rows) && segment.rows.length > 0, `${prefix}: rows 必须非空`);

    const rowYs = new Set();
    for (const row of segment.rows || []) {
      const rowPrefix = `${prefix}/row-${row.y}`;
      check(Number.isInteger(row.y) && row.y >= 0 && row.y < segment.height, `${rowPrefix}: y 必须是段内整数格`);
      check(!rowYs.has(row.y), `${rowPrefix}: y 重复`);
      rowYs.add(row.y);
      const worldRowY = segmentStartY + row.y;
      if (previousWorldRowY !== null) {
        const spacing = worldRowY - previousWorldRowY;
        check(spacing >= 3 && spacing <= 4, `${rowPrefix}: 相邻楼梯纵距必须为 3–4 格`);
      }
      previousWorldRowY = worldRowY;

      check(Array.isArray(row.platforms) && row.platforms.length >= 1 && row.platforms.length <= 2, `${rowPrefix}: 每层需要 1–2 块平台`);
      for (const [platformIndex, platform] of (row.platforms || []).entries()) {
        const platformPrefix = `${rowPrefix}/platform-${platformIndex}`;
        check(
          Number.isInteger(platform.x) && Number.isInteger(platform.w)
            && platform.x >= 0 && platform.w >= 3 && platform.x + platform.w <= 16,
          `${platformPrefix}: 平台必须在 16 列内且至少 3 格宽`
        );
        platformCount += 1;
        if (platform.x > 0 && platform.x + platform.w < 16) floatingCount += 1;
        if (platform.motion !== undefined) {
          check(
            Number.isInteger(platform.motion?.distance) && platform.motion.distance > 0
              && isNumber(platform.motion?.speed) && platform.motion.speed > 0
              && platform.x + platform.w + platform.motion.distance <= 16
              && (platform.motion.phase === undefined || (isNumber(platform.motion.phase) && platform.motion.phase >= 0 && platform.motion.phase < 2)),
            `${platformPrefix}: 水平电梯参数非法或移动终点越界`
          );
          movingCount += 1;
        }
        check(platform.spikes === undefined || Array.isArray(platform.spikes), `${platformPrefix}: spikes 必须为数组`);
        for (const spike of platform.spikes || []) {
          check(
            Number.isInteger(spike.offset) && Number.isInteger(spike.w)
              && spike.offset >= 0 && spike.w > 0 && spike.offset + spike.w <= platform.w,
            `${platformPrefix}: 尖刺必须完整落在平台上`
          );
          spikeCount += 1;
        }
      }

      check(row.beans === undefined || Array.isArray(row.beans), `${rowPrefix}: beans 必须为数组`);
      for (const bean of row.beans || []) {
        const platform = row.platforms?.[bean.platform];
        check(Number.isInteger(bean.platform) && Boolean(platform), `${rowPrefix}: 彩球必须绑定有效平台下标`);
        check(isNumber(bean.offset) && bean.offset >= 0 && platform && bean.offset < platform.w, `${rowPrefix}: 彩球平台内偏移越界`);
        if (platform) {
          const center = bean.offset + 0.5;
          const overSpike = (platform.spikes || []).some((spike) => center >= spike.offset && center <= spike.offset + spike.w);
          check(!overSpike, `${rowPrefix}: 彩球不能悬在尖刺正上方`);
        }
        beanCount += 1;
      }
    }
    segmentStartY += segment.height;
  }
  check(floatingCount >= 12, 'endless: 需要足够多的中间悬浮平台');
  check(movingCount >= 6, 'endless: 至少需要 6 个水平电梯');
  check(spikeCount >= 6, 'endless: 至少需要 6 组平台尖刺');
  console.log(`endless: ${endless.segments.length} segments, ${platformCount} platforms, ${movingCount} elevators, ${spikeCount} spikes, ${beanCount} balls, speed ${endless.speed.initial}-${endless.speed.max}`);
}

if (errors.length) {
  console.error(`\n内容校验失败（${errors.length} 项）：`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('\n内容校验通过。');
