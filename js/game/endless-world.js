// @owner codex
(function () {
  const WIDTH = 960;
  const HEIGHT = 540;
  const BASE_TILE = 48;
  const WORLD_SCALE = 0.75;
  const TILE = BASE_TILE * WORLD_SCALE;
  const COLUMNS = 16;
  const FIELD_X = (WIDTH - COLUMNS * TILE) / 2;
  const FIELD_RIGHT = WIDTH - FIELD_X;
  const PLAYER_W = Math.round(34 * WORLD_SCALE);
  const PLAYER_H = Math.round(46 * WORLD_SCALE);
  const PLATFORM_H = Math.round(14 * WORLD_SCALE);
  const SPIKE_H = Math.round(12 * WORLD_SCALE);
  const BEAN_PICKUP_SIZE = 64 * WORLD_SCALE;
  const BEAN_Y_OFFSET = 24 * WORLD_SCALE;
  const GRAVITY = 1500 * WORLD_SCALE;
  const FAST_FALL_GRAVITY = 1900 * WORLD_SCALE;
  const MAX_FALL_SPEED = 620 * WORLD_SCALE;
  const JUMP_SPEED = 560 * WORLD_SCALE;
  const MOVE_SPEED = 250 * WORLD_SCALE;
  const MOVE_ACCELERATION = 1900 * WORLD_SCALE;
  const DASH_SPEED = 430 * WORLD_SCALE;
  const FOOT_EPSILON = 2;

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function approach(value, target, amount) {
    if (value < target) return Math.min(value + amount, target);
    return Math.max(value - amount, target);
  }

  class EndlessWorld {
    constructor(config, content, save, callbacks) {
      this.config = config;
      this.content = content;
      this.save = save;
      this.callbacks = callbacks;
      this.theme = content.themes.night;
      this.characterId = content.sprites[save.settings?.character] ? save.settings.character : 'cow';
      const spriteData = content.sprites[this.characterId];
      this.sprite = Park.engine.renderer.buildSprite(spriteData, 2);
      this.spriteDraw = {
        w: Math.round((spriteData.draw?.w || 50) * WORLD_SCALE),
        h: Math.round((spriteData.draw?.h || 50) * WORLD_SCALE)
      };
      this.time = 0;
      this.speed = config.speed.initial;
      this.tile = TILE;
      this.worldScale = WORLD_SCALE;
      this.cameraY = 0;
      this.segmentIndex = 0;
      this.nextSegmentY = 7 * TILE;
      this.platforms = [];
      this.beans = [];
      this.particles = [];
      this.trails = [];
      this.collected = 0;
      this.ended = false;
      this.lastHudScore = -1;
      this.player = {
        x: FIELD_X + TILE,
        y: 0,
        w: PLAYER_W,
        h: PLAYER_H,
        vx: 0,
        vy: 0,
        facing: 1,
        dashTime: 0,
        dashAvailable: true,
        standingPlatformId: null
      };
      this.fillAhead();
      const startPlatform = this.platforms[0];
      this.player.x = startPlatform.x + TILE;
      this.player.y = startPlatform.y - this.player.h;
      this.player.standingPlatformId = startPlatform.id;
      this.publishHud(true);
    }

    get score() {
      return Math.floor(
        this.time * this.config.scoring.survivalPerSecond
          + this.collected * this.config.scoring.beanPoints
      );
    }

    appendSegment() {
      const segment = this.config.segments[this.segmentIndex % this.config.segments.length];
      const startY = this.nextSegmentY;
      for (const row of segment.rows) {
        const rowPlatforms = row.platforms.map((item, platformIndex) => {
          const platform = {
            id: `${segment.id}-${this.segmentIndex}-row-${row.y}-platform-${platformIndex}`,
            x: FIELD_X + item.x * TILE,
            baseX: FIELD_X + item.x * TILE,
            y: startY + row.y * TILE,
            w: item.w * TILE,
            h: PLATFORM_H,
            dx: 0,
            motion: item.motion ? { ...item.motion } : null,
            spikes: (item.spikes || []).map((spike) => ({ ...spike }))
          };
          this.platforms.push(platform);
          return platform;
        });
        for (const bean of row.beans || []) {
          const platform = rowPlatforms[bean.platform];
          this.beans.push({
            id: `${segment.id}-${this.segmentIndex}-bean-${row.y}-${bean.platform}-${bean.offset}`,
            platformId: platform.id,
            offset: bean.offset,
            x: platform.x + (bean.offset + 0.5) * TILE,
            y: platform.y - BEAN_Y_OFFSET,
            collected: false,
            pulse: Math.random() * Math.PI * 2
          });
        }
      }
      this.nextSegmentY += segment.height * TILE;
      this.segmentIndex += 1;
    }

    fillAhead() {
      while (this.nextSegmentY < this.cameraY + HEIGHT * 2.5) this.appendSegment();
    }

    update(dt, input) {
      if (this.ended) return;
      if (input.restartPressed) {
        this.callbacks.restart();
        return;
      }

      this.time += dt;
      this.speed = Math.min(
        this.config.speed.max,
        this.config.speed.initial + this.time * this.config.speed.increasePerSecond
      );
      this.updatePlatforms();

      const player = this.player;
      const carrier = this.platforms.find((platform) => platform.id === player.standingPlatformId);
      if (carrier) player.x += carrier.dx;
      if (input.jumpPressed && carrier && this.platformUnder(carrier, player)) {
        player.standingPlatformId = null;
        player.vy = -JUMP_SPEED;
        Park.engine.audio.sounds.jump();
      }

      if (player.dashTime > 0) {
        player.dashTime = Math.max(0, player.dashTime - dt);
        if (Math.floor(this.time * 48) % 2 === 0) this.addTrail(false);
      } else {
        player.vx = approach(player.vx, input.moveX * MOVE_SPEED, MOVE_ACCELERATION * dt);
        if (input.moveX) player.facing = Math.sign(input.moveX);
      }

      if (input.dashPressed && player.dashAvailable && player.dashTime <= 0) {
        const direction = input.moveX || player.facing || 1;
        player.vx = Math.sign(direction) * DASH_SPEED;
        player.facing = Math.sign(direction);
        player.dashTime = 0.16;
        player.dashAvailable = false;
        this.addTrail(true);
        Park.engine.audio.sounds.dash();
      }

      player.x += player.vx * dt;
      player.x = Math.max(FIELD_X, Math.min(FIELD_RIGHT - player.w, player.x));
      this.cameraY += this.speed * WORLD_SCALE * dt;
      this.fillAhead();

      const standingPlatform = this.platforms.find((platform) => platform.id === player.standingPlatformId);
      if (standingPlatform && this.platformUnder(standingPlatform, player)) {
        player.y = standingPlatform.y - player.h;
        player.vy = 0;
      } else {
        player.standingPlatformId = null;
        const previousTop = player.y;
        const previousBottom = player.y + player.h;
        const gravity = GRAVITY + (input.moveY > 0 ? FAST_FALL_GRAVITY : 0);
        player.vy = Math.min(MAX_FALL_SPEED, player.vy + gravity * dt);
        player.y += player.vy * dt;
        if (player.vy < 0) this.updateCeilings(previousTop);
        else this.updateLandings(previousBottom);
      }

      this.updateHazards();
      if (this.ended) return;
      this.updateBeans();
      this.updateEffects(dt);

      const playerScreenY = player.y - this.cameraY;
      if (playerScreenY <= 0) {
        this.endRun('被楼梯顶出了画面');
        return;
      }
      if (playerScreenY + player.h >= HEIGHT) {
        this.endRun('掉到了楼梯最底部');
        return;
      }
      this.pruneWorld();
      this.publishHud(false);
    }

    updatePlatforms() {
      for (const platform of this.platforms) {
        const oldX = platform.x;
        if (platform.motion) {
          const distance = platform.motion.distance * TILE;
          const speed = platform.motion.speed * WORLD_SCALE;
          const phase = (this.time * speed / distance + (platform.motion.phase || 0)) % 2;
          const ratio = phase <= 1 ? phase : 2 - phase;
          platform.x = platform.baseX + ratio * distance;
        }
        platform.dx = platform.x - oldX;
      }
      for (const bean of this.beans) {
        const platform = this.platforms.find((item) => item.id === bean.platformId);
        if (!platform) continue;
        bean.x = platform.x + (bean.offset + 0.5) * TILE;
        bean.y = platform.y - BEAN_Y_OFFSET;
      }
    }

    platformUnder(platform, player) {
      const footOnPlatform = Math.abs(player.y + player.h - platform.y) <= FOOT_EPSILON;
      return footOnPlatform && this.overlapsPlatform(platform, player);
    }

    overlapsPlatform(platform, player) {
      return player.x < platform.x + platform.w && player.x + player.w > platform.x;
    }

    updateLandings(previousBottom = this.player.y + this.player.h) {
      const player = this.player;
      const currentBottom = player.y + player.h;
      let landing = null;
      for (const platform of this.platforms) {
        if (platform.y < previousBottom - FOOT_EPSILON || platform.y > currentBottom) continue;
        if (!this.overlapsPlatform(platform, player)) continue;
        if (!landing || platform.y < landing.y) landing = platform;
      }
      if (!landing) return;
      player.y = landing.y - player.h;
      player.vy = 0;
      player.standingPlatformId = landing.id;
      player.dashAvailable = true;
      Park.engine.audio.sounds.land();
    }

    updateCeilings(previousTop = this.player.y) {
      const player = this.player;
      const currentTop = player.y;
      let ceiling = null;
      for (const platform of this.platforms) {
        const underside = platform.y + platform.h;
        if (underside > previousTop + FOOT_EPSILON || underside < currentTop - FOOT_EPSILON) continue;
        if (!this.overlapsPlatform(platform, player)) continue;
        if (!ceiling || underside > ceiling.underside) ceiling = { underside };
      }
      if (!ceiling) return;
      player.y = ceiling.underside;
      player.vy = 0;
    }

    updateHazards() {
      const player = this.player;
      for (const platform of this.platforms) {
        for (const spike of platform.spikes) {
          const box = {
            x: platform.x + spike.offset * TILE,
            y: platform.y - SPIKE_H,
            w: spike.w * TILE,
            h: SPIKE_H
          };
          if (overlap(player, box)) {
            this.endRun('踩到了楼梯尖刺');
            return;
          }
        }
      }
    }

    updateBeans() {
      const player = this.player;
      for (const bean of this.beans) {
        if (bean.collected) continue;
        const halfPickup = BEAN_PICKUP_SIZE / 2;
        const box = {
          x: bean.x - halfPickup,
          y: bean.y - halfPickup,
          w: BEAN_PICKUP_SIZE,
          h: BEAN_PICKUP_SIZE
        };
        if (!overlap(player, box)) continue;
        bean.collected = true;
        this.collected += 1;
        this.emitParticles(bean.x, bean.y, this.theme.accent, 10);
        Park.engine.audio.sounds.bean();
      }
      this.beans = this.beans.filter((bean) => !bean.collected && bean.y >= this.cameraY - TILE);
    }

    pruneWorld() {
      const liveIds = new Set();
      this.platforms = this.platforms.filter((platform) => {
        const keep = platform.y + platform.h >= this.cameraY - TILE;
        if (keep) liveIds.add(platform.id);
        return keep;
      });
      this.beans = this.beans.filter((bean) => liveIds.has(bean.platformId));
    }

    publishHud(force) {
      const score = this.score;
      if (!force && score === this.lastHudScore) return;
      this.lastHudScore = score;
      this.callbacks.hud({ time: this.time, score, beans: this.collected, speed: this.speed });
    }

    endRun(reason) {
      if (this.ended) return;
      this.ended = true;
      Park.engine.audio.sounds.hurt();
      this.emitParticles(
        this.player.x + this.player.w / 2,
        this.player.y + this.player.h / 2,
        this.theme.danger,
        22
      );
      this.callbacks.complete({
        reason,
        score: this.score,
        time: this.time,
        beans: this.collected,
        speed: this.speed
      });
    }

    addTrail(strong) {
      this.trails.push({
        x: this.player.x,
        y: this.player.y,
        facing: this.player.facing,
        life: strong ? 0.25 : 0.15
      });
      if (this.trails.length > 10) this.trails.shift();
    }

    emitParticles(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 210 * WORLD_SCALE,
          vy: (Math.random() - 0.5) * 210 * WORLD_SCALE,
          life: 0.35 + Math.random() * 0.3,
          color
        });
      }
    }

    updateEffects(dt) {
      this.trails.forEach((item) => { item.life -= dt; });
      this.trails = this.trails.filter((item) => item.life > 0);
      this.particles.forEach((item) => {
        item.life -= dt;
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.vy += 320 * WORLD_SCALE * dt;
      });
      this.particles = this.particles.filter((item) => item.life > 0);
    }

    render() {
      const renderer = Park.engine.renderer;
      const ctx = renderer.ctx;
      renderer.clear(this.theme, this.time, 'night');

      ctx.save();
      ctx.fillStyle = 'rgba(8, 13, 25, 0.3)';
      ctx.fillRect(FIELD_X, 0, COLUMNS * TILE, HEIGHT);
      ctx.strokeStyle = 'rgba(244, 200, 74, 0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(FIELD_X, 0, COLUMNS * TILE, HEIGHT);

      for (let i = 0; i < 12; i += 1) {
        const x = FIELD_X + ((i * 83) % (COLUMNS * TILE));
        const y = ((i * 97 - this.cameraY * (0.35 + (i % 3) * 0.08)) % 650) - 60;
        ctx.fillStyle = 'rgba(255,255,255,.1)';
        ctx.fillRect(x, y, 2, 42 + (i % 4) * 15);
      }

      for (const platform of this.platforms) {
        const y = platform.y - this.cameraY;
        if (y < -PLATFORM_H || y > HEIGHT) continue;
        ctx.fillStyle = this.theme.terrain;
        ctx.fillRect(platform.x, y, platform.w, platform.h);
        ctx.fillStyle = this.theme.terrainTop;
        ctx.fillRect(platform.x, y, platform.w, 3);
        if (platform.motion) {
          ctx.fillStyle = this.theme.accent;
          const inset = 12 * WORLD_SCALE;
          ctx.fillRect(platform.x + inset, y + 6, Math.max(inset, platform.w - inset * 2), 2);
        }
        for (const spike of platform.spikes) {
          const count = Math.max(1, Math.round(spike.w * 2));
          const width = spike.w * TILE / count;
          ctx.fillStyle = this.theme.danger;
          for (let i = 0; i < count; i += 1) {
            const x = platform.x + spike.offset * TILE + i * width;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + width / 2, y - SPIKE_H);
            ctx.lineTo(x + width, y);
            ctx.fill();
          }
        }
      }

      for (const bean of this.beans) {
        const y = bean.y - this.cameraY;
        if (y < -24 || y > HEIGHT + 24) continue;
        const pulse = 1 + Math.sin(this.time * 6 + bean.pulse) * 0.12;
        ctx.save();
        ctx.translate(bean.x, y);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = this.theme.accent;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.72)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      this.trails.forEach((trail) => {
        const spriteW = this.spriteDraw.w;
        const spriteH = this.spriteDraw.h;
        ctx.save();
        ctx.globalAlpha = trail.life * 1.7;
        ctx.translate(trail.x + PLAYER_W / 2, trail.y - this.cameraY + PLAYER_H / 2);
        ctx.scale(trail.facing, 1);
        ctx.drawImage(
          this.sprite,
          -spriteW / 2,
          -spriteH / 2,
          spriteW,
          spriteH
        );
        ctx.restore();
      });

      const playerY = this.player.y - this.cameraY;
      const spriteW = this.spriteDraw.w;
      const spriteH = this.spriteDraw.h;
      ctx.save();
      ctx.translate(this.player.x + PLAYER_W / 2, playerY + PLAYER_H / 2);
      ctx.scale(this.player.facing, 1);
      ctx.rotate(this.player.vx / DASH_SPEED * 0.08);
      ctx.drawImage(
        this.sprite,
        -spriteW / 2,
        -spriteH / 2,
        spriteW,
        spriteH
      );
      ctx.restore();

      this.particles.forEach((particle) => {
        ctx.globalAlpha = Math.min(1, particle.life * 3);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - 2, particle.y - this.cameraY - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      const bottomDanger = Math.max(0, Math.min(0.8, (playerY - 390) / 100));
      if (bottomDanger > 0) {
        const gradient = ctx.createLinearGradient(0, HEIGHT - 90, 0, HEIGHT);
        gradient.addColorStop(0, 'rgba(224,87,79,0)');
        gradient.addColorStop(1, `rgba(224,87,79,${bottomDanger})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(FIELD_X, HEIGHT - 90, COLUMNS * TILE, 90);
      }
      const topDanger = Math.max(0, Math.min(0.8, (105 - playerY) / 90));
      if (topDanger > 0) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 90);
        gradient.addColorStop(0, `rgba(224,87,79,${topDanger})`);
        gradient.addColorStop(1, 'rgba(224,87,79,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(FIELD_X, 0, COLUMNS * TILE, 90);
      }
      ctx.restore();
    }
  }

  Park.game.EndlessWorld = EndlessWorld;
})();
