// @owner codex
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const silent = new Proxy({}, { get: () => () => {} });
let stored = null;
const context = vm.createContext({
  console,
  Math,
  JSON,
  localStorage: {
    getItem: () => stored,
    setItem: (_key, value) => { stored = value; }
  },
  Park: {
    game: {},
    engine: {
      renderer: { buildSprite: () => ({}) },
      audio: { sounds: silent }
    }
  },
  window: {}
});

function run(relative) {
  vm.runInContext(fs.readFileSync(path.join(root, relative), 'utf8'), context, { filename: relative });
}

run('js/content/manifest.js');
context.ParkContent = context.window.ParkContent;
run('js/content/cow.js');
run('js/content/endless.js');
run('js/engine/storage.js');
run('js/game/endless-world.js');

const content = JSON.parse(JSON.stringify(context.window.ParkContent));

function input(extra = {}) {
  return {
    moveX: 0,
    moveY: 0,
    jumpPressed: false,
    dashPressed: false,
    restartPressed: false,
    ...extra
  };
}

function createWorld() {
  const events = { hud: [], complete: [], restarts: 0 };
  const world = new context.Park.game.EndlessWorld(content.modes.endless, content, {
    hud: (data) => events.hud.push(data),
    complete: (data) => events.complete.push(data),
    restart: () => { events.restarts += 1; }
  });
  return { world, events };
}

test('legacy save gains an endless high score without losing level progress', () => {
  stored = JSON.stringify({
    version: 1,
    settings: { muted: true },
    progress: { dashUnlocked: true, unlockedLevel: 3, bestStars: { level1: 2 } }
  });
  const save = context.Park.engine.storage.load(['level1', 'level2', 'level3', 'level4', 'level5']);
  assert.equal(save.progress.unlockedLevel, 3);
  assert.equal(save.progress.bestStars.level1, 2);
  assert.equal(save.progress.bestEndlessScore, 0);
});

test('segments generate floating stairs, elevators, spikes, and balls ahead', () => {
  const { world } = createWorld();
  assert.ok(world.platforms.length >= 10);
  assert.ok(world.platforms.some((platform) => platform.motion));
  assert.ok(world.platforms.some((platform) => platform.spikes.length));
  assert.ok(world.beans.length >= 5);
  assert.ok(world.nextSegmentY > 540);
  assert.equal(world.player.standingPlatformId, world.platforms[0].id);
  assert.equal(world.player.y + world.player.h, world.platforms[0].y);
});

test('speed and score use the content formulas while stairs carry the cow upward', () => {
  const { world } = createWorld();
  world.time = 10;
  world.collected = 2;
  assert.equal(world.score, 130);
  world.time = 0;
  world.collected = 0;
  const worldY = world.player.y;
  const screenY = world.player.y - world.cameraY;
  world.update(0.5, input());
  assert.equal(world.speed, 42.675);
  assert.equal(world.player.y, worldY);
  assert.ok(world.player.y - world.cameraY < screenY);
});

test('the slower opening gives more than six seconds before an idle top-out', () => {
  const { world, events } = createWorld();
  while (!world.ended && world.time < 9) world.update(1 / 120, input());
  assert.equal(world.ended, true);
  assert.ok(world.time > 6 && world.time < 8);
  assert.match(events.complete[0].reason, /顶/);
});

test('jump launches only from a stair and cannot repeat in midair', () => {
  const { world } = createWorld();
  const startY = world.player.y;
  world.update(1 / 120, input({ jumpPressed: true }));
  assert.equal(world.player.standingPlatformId, null);
  assert.ok(world.player.vy < -540);
  assert.ok(world.player.y < startY);
  const airborneVelocity = world.player.vy;
  world.update(1 / 120, input({ jumpPressed: true }));
  assert.ok(world.player.vy > airborneVelocity);
});

test('walking off a stair starts a fall and landing resets dash', () => {
  const { world } = createWorld();
  const start = world.platforms[0];
  world.player.x = start.x + start.w + 2;
  world.update(1 / 120, input());
  assert.equal(world.player.standingPlatformId, null);
  assert.ok(world.player.vy > 0);

  const landing = world.platforms[1];
  world.player.x = landing.x + 20;
  world.player.y = landing.y - world.player.h + 1;
  world.player.vy = 100;
  world.player.dashAvailable = false;
  world.updateLandings(landing.y - 1);
  assert.equal(world.player.standingPlatformId, landing.id);
  assert.equal(world.player.y + world.player.h, landing.y);
  assert.equal(world.player.dashAvailable, true);
});

test('balls float above their stair and remain collectible while standing', () => {
  const { world } = createWorld();
  const bean = world.beans[0];
  const platform = world.platforms.find((item) => item.id === bean.platformId);
  assert.ok(bean.y + 10 < platform.y);
  world.player.x = bean.x - world.player.w / 2;
  world.player.y = platform.y - world.player.h;
  world.player.standingPlatformId = platform.id;
  world.updateBeans();
  assert.equal(world.collected, 1);
  assert.equal(world.score, 40);
  assert.equal(world.ended, false);
});

test('a horizontal elevator carries the cow and same-direction input is faster', () => {
  const same = createWorld();
  const opposite = createWorld();
  for (const run of [same, opposite]) {
    const platform = run.world.platforms.find((item) => item.motion);
    run.platform = platform;
    run.startX = platform.x + 30;
    run.world.player.x = run.startX;
    run.world.player.y = platform.y - run.world.player.h;
    run.world.player.standingPlatformId = platform.id;
    run.world.cameraY = platform.y - 300;
  }
  same.world.update(0.1, input({ moveX: 1 }));
  opposite.world.update(0.1, input({ moveX: -1 }));
  assert.ok(same.platform.dx > 0);
  assert.ok(same.world.player.x - same.startX > opposite.world.player.x - opposite.startX);
  const carriedBean = same.world.beans.find((item) => item.platformId === same.platform.id);
  assert.ok(carriedBean);
  assert.equal(carriedBean.x, same.platform.x + (carriedBean.offset + 0.5) * 48);
});

test('touching stair spikes ends the run', () => {
  const { world, events } = createWorld();
  const platform = world.platforms.find((item) => item.spikes.length);
  const spike = platform.spikes[0];
  world.player.x = platform.x + spike.offset * 48 + 4;
  world.player.y = platform.y - world.player.h;
  world.player.standingPlatformId = platform.id;
  world.updateHazards();
  assert.equal(world.ended, true);
  assert.match(events.complete[0].reason, /尖刺/);
});

test('dash stays horizontal and fast fall accelerates an unsupported cow', () => {
  const dashRun = createWorld();
  dashRun.world.update(1 / 120, input({ moveX: -1, dashPressed: true }));
  assert.equal(dashRun.world.player.vx, -430);
  assert.equal(dashRun.world.player.dashAvailable, false);

  const normal = createWorld();
  const fast = createWorld();
  for (const run of [normal, fast]) {
    run.world.player.x = 800;
    run.world.player.standingPlatformId = null;
  }
  normal.world.update(1 / 120, input());
  fast.world.update(1 / 120, input({ moveY: 1 }));
  assert.ok(fast.world.player.vy > normal.world.player.vy);
});

test('being carried past the top and falling past the bottom both end the run', () => {
  const top = createWorld();
  top.world.cameraY = top.world.player.y + 1;
  top.world.update(1 / 120, input());
  assert.equal(top.world.ended, true);
  assert.match(top.events.complete[0].reason, /顶/);

  const bottom = createWorld();
  bottom.world.player.standingPlatformId = null;
  bottom.world.player.x = 800;
  bottom.world.player.y = bottom.world.cameraY + 540 - bottom.world.player.h + 1;
  bottom.world.update(1 / 120, input({ moveY: 1 }));
  assert.equal(bottom.world.ended, true);
  assert.match(bottom.events.complete[0].reason, /最底部/);
});

test('restart input delegates to the scene', () => {
  const next = createWorld();
  next.world.update(1 / 120, input({ restartPressed: true }));
  assert.equal(next.events.restarts, 1);
});
