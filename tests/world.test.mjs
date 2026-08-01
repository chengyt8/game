// @owner codex
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const silent = new Proxy({}, { get: () => () => {} });
const context = vm.createContext({
  console,
  Math,
  JSON,
  Park: {
    game: {},
    engine: {
      renderer: { buildSprite: () => ({}) },
      audio: { sounds: silent },
      storage: { save: () => true }
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
run('js/content/level1.js');
run('js/content/level2.js');
run('js/content/level3.js');
run('js/content/level4.js');
run('js/content/level5.js');
run('js/game/physics.js');
run('js/game/world.js');

const content = JSON.parse(JSON.stringify(context.window.ParkContent));

function save() {
  return {
    settings: { muted: false },
    progress: {
      dashUnlocked: false,
      unlockedLevel: 1,
      bestStars: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 }
    }
  };
}

function input(extra = {}) {
  return {
    moveX: 0, moveY: 0, jumpDown: false, jumpPressed: false, jumpReleased: false,
    dashPressed: false, restartPressed: false, pausePressed: false, mutePressed: false,
    ...extra
  };
}

function worldWithEvents(id = 'level1') {
  const events = { hud: [], toast: [], complete: [] };
  const instance = new context.Park.game.World(content.levels[id], content, save(), {
    hud(data) { events.hud.push(data); },
    toast(message) { events.toast.push(message); },
    complete(data) { events.complete.push(data); }
  });
  return { instance, events };
}

function world(id = 'level1') {
  return worldWithEvents(id).instance;
}

function settle(instance, seconds = 1) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 120) instance.update(1 / 120, input());
}

test('player settles on the first platform', () => {
  const instance = world();
  settle(instance);
  assert.equal(instance.player.onGround, true);
  assert.ok(Math.abs(instance.player.y + instance.player.h - 480) < 0.01);
});

test('jump buffer fires and jump release shortens ascent', () => {
  const instance = world();
  settle(instance);
  instance.update(1 / 120, input({ jumpPressed: true, jumpDown: true }));
  const initialVelocity = instance.player.vy;
  assert.ok(initialVelocity < -600);
  instance.update(1 / 120, input({ jumpReleased: true }));
  assert.ok(Math.abs(instance.player.vy) < Math.abs(initialVelocity));
});

test('air dash snaps diagonally and is consumed until landing', () => {
  const instance = world('level2');
  instance.player.dashUnlocked = true;
  instance.player.onGround = false;
  instance.player.y -= 100;
  instance.update(1 / 120, input({ moveX: 1, moveY: -1, dashPressed: true }));
  assert.ok(instance.player.vx > 290 && instance.player.vx < 300);
  assert.ok(instance.player.vy < -290 && instance.player.vy > -300);
  assert.equal(instance.player.dashAvailable, false);
});

test('level 2 opening dash gap has no safety platform', () => {
  const openingGapPlatforms = content.levels.level2.platforms.filter((platform) => (
    platform.y >= 12 && platform.x < 15 && platform.x + platform.w > 10
  ));
  assert.equal(openingGapPlatforms.length, 0);
});

test('checkpoint pole activates from the main route and preserves collection on death', () => {
  const instance = world();
  instance.player.x = instance.checkpoint.x - instance.player.w / 2;
  instance.player.y = 480 - instance.player.h;
  instance.collectibles[0].collected = true;
  instance.updateTriggers();
  assert.equal(instance.checkpoint.active, true);
  instance.die();
  instance.deathTimer = 0;
  instance.respawn();
  assert.equal(instance.collectibles[0].collected, true);
  assert.equal(instance.player.x, instance.checkpoint.x - instance.player.w / 2);
});

test('secret rewards stay hidden until entering the unmarked area', () => {
  const { instance, events } = worldWithEvents('level2');
  const secret = instance.secrets[0];
  const rewards = instance.collectibles.filter((item) => item.secretId === secret.id);
  const hiddenPlatforms = instance.platforms.filter((item) => item.secretId === secret.id);
  assert.ok(rewards.length >= 2);
  assert.ok(hiddenPlatforms.length >= 2);
  assert.ok(rewards.every((item) => !instance.isCollectibleVisible(item)));
  assert.ok(hiddenPlatforms.every((item) => !instance.isPlatformActive(item)));
  assert.equal(events.hud.at(-1).secretsFound, 0);
  assert.equal(events.hud.at(-1).secretsTotal, 1);

  instance.player.x = secret.x + secret.w / 2 - instance.player.w / 2;
  instance.player.y = secret.y + secret.h / 2 - instance.player.h / 2;
  instance.updateTriggers();
  assert.equal(secret.found, true);
  assert.ok(secret.revealTime > 1);
  assert.ok(rewards.every((item) => instance.isCollectibleVisible(item)));
  assert.ok(hiddenPlatforms.every((item) => instance.isPlatformActive(item)));
  assert.match(events.toast.at(-1), /隐藏区域 1\/1/);
  assert.equal(events.hud.at(-1).secretsFound, 1);
  assert.ok(instance.particles.length >= 30);
  assert.equal(content.levels.level4.signs.find((item) => item.id === 'secret-tip').text, '上面好像有好东西');
});

test('level 3 walker stands on its platform row', () => {
  const instance = world('level3');
  const enemy = instance.enemies[0];
  assert.equal(enemy.y + enemy.h, 12 * 48);
});

test('new levels load with their agreed enemy limits and final marker', () => {
  const level4 = world('level4');
  const level5 = world('level5');
  assert.equal(level4.enemies.length, 0);
  assert.equal(level4.isFinalLevel, false);
  assert.equal(level5.enemies.length, 2);
  assert.equal(level5.isFinalLevel, true);
  assert.ok(level5.enemies.every((enemy) => enemy.y + enemy.h === 12 * 48));
});
