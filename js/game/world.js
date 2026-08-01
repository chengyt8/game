// @owner codex
(function () {
  const TILE = 48;
  const PLAYER_W = 34;
  const PLAYER_H = 46;
  const physics = Park.game.physics;

  function rectFromTiles(rect) {
    return { ...rect, x: rect.x * TILE, y: rect.y * TILE, w: rect.w * TILE, h: rect.h * TILE };
  }
  function pointFromTiles(point) { return { ...point, x: point.x * TILE, y: point.y * TILE }; }
  function containsPoint(rect, point) {
    return point.x >= rect.x && point.x <= rect.x + rect.w
      && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  class World {
    constructor(level, content, save, callbacks) {
      this.level = level;
      this.content = content;
      this.isFinalLevel = content.levelOrder.at(-1) === level.id;
      this.save = save;
      this.callbacks = callbacks;
      this.theme = content.themes[level.theme];
      this.width = level.size.w * TILE;
      this.height = level.size.h * TILE;
      this.time = 0;
      this.camera = { x: 0, y: 0 };
      this.secrets = level.secrets.map((item) => ({ ...rectFromTiles(item), found: false, revealTime: 0 }));
      this.platforms = level.platforms.map((item) => {
        const platform = rectFromTiles(item);
        const secret = this.secrets.find((area) => (
          platform.x < area.x + area.w && platform.x + platform.w > area.x
            && platform.y >= area.y && platform.y <= area.y + area.h
        ));
        return { ...platform, baseX: platform.x, baseY: platform.y, dx: 0, dy: 0, secretId: secret?.id || null };
      });
      this.hazards = level.hazards.map(rectFromTiles);
      this.springs = level.springs.map((item) => ({ ...pointFromTiles(item), w: 34, h: 14 }));
      this.collectibles = level.collectibles.map((item) => {
        const collectible = pointFromTiles(item);
        const secret = this.secrets.find((area) => containsPoint(area, collectible));
        return {
          ...collectible,
          collected: false,
          pulse: Math.random() * Math.PI * 2,
          secretId: secret?.id || null
        };
      });
      this.checkpoint = { ...pointFromTiles(level.checkpoint), active: false };
      this.exit = rectFromTiles(level.exit);
      this.unlockDash = level.unlockDashAt ? { ...pointFromTiles(level.unlockDashAt), collected: false } : null;
      this.signs = level.signs.map(pointFromTiles);
      this.enemies = level.enemies.map((item) => {
        const h = 34;
        const x = item.x * TILE;
        return {
          ...item, x, y: item.y * TILE + (TILE - h), w: 38, h, baseX: x,
          patrolPixels: item.patrol * TILE, direction: -1, dead: false
        };
      });
      this.spawn = pointFromTiles(level.spawn);
      this.characterId = content.sprites[save.settings?.character] ? save.settings.character : 'cow';
      const spriteData = content.sprites[this.characterId];
      this.sprite = Park.engine.renderer.buildSprite(spriteData, 2);
      this.spriteDraw = spriteData.draw || { w: 50, h: 50 };
      this.particles = [];
      this.trails = [];
      this.completed = false;
      this.deathTimer = 0;
      this.resetPlayer(this.spawn);
      this.callbacks.hud(this.hud());
    }

    resetPlayer(point) {
      this.player = {
        x: point.x - PLAYER_W / 2, y: point.y - PLAYER_H,
        previousY: point.y - PLAYER_H, w: PLAYER_W, h: PLAYER_H,
        vx: 0, vy: 0, facing: 1, onGround: false, standingOn: null,
        coyote: 0, jumpBuffer: 0, dashTime: 0, dashAvailable: true,
        dashUnlocked: this.save.progress.dashUnlocked,
        squash: 0, stretch: 0, tilt: 0
      };
    }

    hud() {
      return {
        level: this.level.title,
        collected: this.collectibles.filter((item) => item.collected).length,
        total: this.collectibles.length,
        secretsFound: this.secrets.filter((item) => item.found).length,
        secretsTotal: this.secrets.length
      };
    }

    update(dt, input) {
      this.time += dt;
      this.updateParticles(dt);
      if (this.completed) return;
      if (this.deathTimer > 0) {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) this.respawn();
        return;
      }

      if (input.restartPressed) {
        this.collectibles.forEach((item) => { item.collected = false; });
        this.secrets.forEach((item) => { item.found = false; item.revealTime = 0; });
        this.checkpoint.active = false;
        this.respawn(true);
        this.callbacks.hud(this.hud());
        return;
      }

      this.updatePlatforms(dt);
      this.updateEnemies(dt);
      this.updatePlayer(dt, input);
      this.updateTriggers();
      this.updateCamera(dt);
    }

    updatePlatforms(dt) {
      this.platforms.forEach((platform) => {
        const oldX = platform.x;
        const oldY = platform.y;
        if (platform.type === 'moving') {
          const distance = platform.motion.distance * TILE;
          const speed = platform.motion.speed * TILE;
          const phase = (this.time * speed / distance) % 2;
          const offset = (phase <= 1 ? phase : 2 - phase) * distance;
          if (platform.motion.axis === 'x') platform.x = platform.baseX + offset;
          else platform.y = platform.baseY + offset;
        }
        platform.dx = platform.x - oldX;
        platform.dy = platform.y - oldY;
      });
    }

    updatePlayer(dt, input) {
      const player = this.player;
      player.previousY = player.y;
      player.squash = physics.approach(player.squash, 0, dt * 4);
      player.stretch = physics.approach(player.stretch, 0, dt * 4);
      player.tilt = physics.approach(player.tilt, player.vx / 300 * 0.08, dt * 0.9);

      const carrier = this.platforms.find((item) => item.id === player.standingOn);
      if (carrier) { player.x += carrier.dx; player.y += carrier.dy; }

      if (player.onGround) {
        player.coyote = 0.09;
        player.dashAvailable = true;
      } else {
        player.coyote = Math.max(0, player.coyote - dt);
      }
      if (input.jumpPressed) player.jumpBuffer = 0.12;
      else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

      if (player.jumpBuffer > 0 && player.coyote > 0 && player.dashTime <= 0) {
        player.vy = -640;
        player.jumpBuffer = 0;
        player.coyote = 0;
        player.onGround = false;
        player.stretch = 0.18;
        Park.engine.audio.sounds.jump();
      }
      if (input.jumpReleased && player.vy < -120) player.vy *= 0.46;

      if (input.dashPressed && player.dashUnlocked && player.dashAvailable && !player.onGround && player.dashTime <= 0) {
        const direction = physics.snapDashDirection(input.moveX, input.moveY, player.facing);
        player.vx = direction.x * 420;
        player.vy = direction.y * 420;
        player.dashTime = 0.18;
        player.dashAvailable = false;
        this.addTrail(true);
        Park.engine.audio.sounds.dash();
      }

      if (player.dashTime > 0) {
        player.dashTime = Math.max(0, player.dashTime - dt);
        if (Math.floor(this.time * 45) % 2 === 0) this.addTrail(false);
      } else {
        const target = input.moveX * 300;
        const acceleration = player.onGround ? 2400 : 2040;
        player.vx = physics.approach(player.vx, target, acceleration * dt);
        if (input.moveX) player.facing = Math.sign(input.moveX);
        player.vy = Math.min(player.vy + 1900 * dt, 980);
      }

      player.standingOn = null;
      this.moveX(player.vx * dt);
      const wasGrounded = player.onGround;
      player.onGround = false;
      this.moveY(player.vy * dt);
      if (!wasGrounded && player.onGround) {
        player.squash = 0.22;
        this.emitParticles(player.x + player.w / 2, player.y + player.h, this.theme.haze, 8);
      }
      if (player.y > this.height + 120) this.die();
    }

    moveX(amount) {
      const player = this.player;
      player.x += amount;
      for (const platform of this.platforms) {
        if (!this.isPlatformActive(platform)) continue;
        if (!physics.overlap(player, platform)) continue;
        if (amount > 0) player.x = platform.x - player.w;
        else if (amount < 0) player.x = platform.x + platform.w;
        player.vx = 0;
      }
      player.x = physics.clamp(player.x, 0, this.width - player.w);
    }

    moveY(amount) {
      const player = this.player;
      player.y += amount;
      for (const platform of this.platforms) {
        if (!this.isPlatformActive(platform)) continue;
        if (!physics.overlap(player, platform)) continue;
        if (amount > 0) {
          player.y = platform.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.standingOn = platform.id;
        } else if (amount < 0) {
          player.y = platform.y + platform.h;
          player.vy = 0;
        }
      }
    }

    updateEnemies(dt) {
      this.enemies.forEach((enemy) => {
        if (enemy.dead) return;
        enemy.x += enemy.direction * enemy.speed * dt;
        const halfPatrol = enemy.patrolPixels / 2;
        if (enemy.x < enemy.baseX - halfPatrol || enemy.x > enemy.baseX + halfPatrol) {
          enemy.x = physics.clamp(enemy.x, enemy.baseX - halfPatrol, enemy.baseX + halfPatrol);
          enemy.direction *= -1;
        }
      });
    }

    updateTriggers() {
      const player = this.player;
      for (const hazard of this.hazards) if (physics.overlap(player, hazard)) return this.die();

      for (const spring of this.springs) {
        const box = { x: spring.x - spring.w / 2, y: spring.y - spring.h, w: spring.w, h: spring.h };
        if (player.vy >= 0 && physics.overlap(player, box)) {
          player.y = box.y - player.h;
          player.vy = -spring.strength;
          player.onGround = false;
          player.stretch = 0.28;
          Park.engine.audio.sounds.spring();
        }
      }

      for (const secret of this.secrets) {
        if (!secret.found && physics.overlap(player, secret)) {
          secret.found = true;
          secret.revealTime = 1.4;
          this.emitParticles(secret.x + secret.w / 2, secret.y + secret.h / 2, this.theme.accent, 18);
          this.emitParticles(secret.x + secret.w / 2, secret.y + secret.h / 2, this.theme.haze, 12);
          this.callbacks.toast(`发现隐藏区域 ${this.secrets.filter((item) => item.found).length}/${this.secrets.length}`);
          Park.engine.audio.sounds.secret();
          this.callbacks.hud(this.hud());
        }
      }

      for (const item of this.collectibles) {
        const box = { x: item.x - 15, y: item.y - 15, w: 30, h: 30 };
        if (!item.collected && this.isCollectibleVisible(item) && physics.overlap(player, box)) {
          item.collected = true;
          this.emitParticles(item.x, item.y, this.theme.accent, 10);
          Park.engine.audio.sounds.bean();
          this.callbacks.hud(this.hud());
        }
      }

      const checkpointBox = { x: this.checkpoint.x - 24, y: this.checkpoint.y, w: 48, h: TILE * 2 };
      if (!this.checkpoint.active && physics.overlap(player, checkpointBox)) {
        this.checkpoint.active = true;
        this.callbacks.toast('存档旗已点亮');
        Park.engine.audio.sounds.checkpoint();
      }

      if (this.unlockDash && !this.unlockDash.collected) {
        const box = { x: this.unlockDash.x - 22, y: this.unlockDash.y - 22, w: 44, h: 44 };
        if (physics.overlap(player, box)) {
          this.unlockDash.collected = true;
          player.dashUnlocked = true;
          this.save.progress.dashUnlocked = true;
          Park.engine.storage.save(this.save);
          this.callbacks.toast('空中冲刺已解锁');
          Park.engine.audio.sounds.unlock();
        }
      }

      for (const enemy of this.enemies) {
        if (enemy.dead || !physics.overlap(player, enemy)) continue;
        const previousBottom = player.previousY + player.h;
        if (player.vy > 0 && previousBottom <= enemy.y + 12) {
          enemy.dead = true;
          player.vy = -420;
          this.emitParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, this.theme.accent, 12);
          Park.engine.audio.sounds.stomp();
        } else {
          return this.die();
        }
      }

      if (physics.overlap(player, this.exit)) this.complete();
    }

    die() {
      if (this.deathTimer > 0 || this.completed) return;
      this.deathTimer = 0.48;
      Park.engine.audio.sounds.hurt();
      this.emitParticles(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, this.theme.danger, 16);
    }

    respawn(forceStart) {
      const point = !forceStart && this.checkpoint.active ? this.checkpoint : this.spawn;
      this.enemies.forEach((enemy) => { enemy.dead = false; enemy.x = enemy.baseX; enemy.direction = -1; });
      this.resetPlayer(point);
      this.camera.x = physics.clamp(point.x - 240, 0, Math.max(0, this.width - 960));
      this.deathTimer = 0;
    }

    complete() {
      if (this.completed) return;
      this.completed = true;
      const count = this.collectibles.filter((item) => item.collected).length;
      const ratio = count / this.collectibles.length;
      const foundSecret = this.secrets.some((item) => item.found);
      const stars = ratio === 1 && foundSecret ? 3 : ratio >= 0.8 ? 2 : 1;
      if (this.isFinalLevel) {
        const x = this.player.x + this.player.w / 2;
        const y = this.player.y + this.player.h / 2;
        this.emitParticles(x, y, this.theme.accent, 28);
        this.emitParticles(x, y, this.theme.haze, 20);
      }
      Park.engine.audio.sounds.win();
      this.callbacks.complete({ stars, collected: count, total: this.collectibles.length });
    }

    updateCamera(dt) {
      const targetX = this.player.x + this.player.w / 2 - 360 + this.player.vx * 0.28;
      const targetY = this.player.y + this.player.h / 2 - 330;
      const amount = 1 - Math.pow(0.001, dt);
      this.camera.x += (targetX - this.camera.x) * amount;
      this.camera.y += (targetY - this.camera.y) * amount * 0.45;
      this.camera.x = physics.clamp(this.camera.x, 0, Math.max(0, this.width - 960));
      this.camera.y = physics.clamp(this.camera.y, 0, Math.max(0, this.height - 540));
    }

    addTrail(strong) {
      this.trails.push({ x: this.player.x, y: this.player.y, facing: this.player.facing, life: strong ? 0.26 : 0.16 });
      if (this.trails.length > 10) this.trails.shift();
    }

    emitParticles(x, y, color, count) {
      for (let i = 0; i < count; i += 1) {
        this.particles.push({ x, y, vx: (Math.random() - 0.5) * 230, vy: -40 - Math.random() * 190, life: 0.35 + Math.random() * 0.35, color });
      }
    }

    updateParticles(dt) {
      this.trails.forEach((item) => { item.life -= dt; });
      this.trails = this.trails.filter((item) => item.life > 0);
      this.secrets.forEach((item) => { item.revealTime = Math.max(0, item.revealTime - dt); });
      this.particles.forEach((item) => { item.life -= dt; item.x += item.vx * dt; item.y += item.vy * dt; item.vy += 620 * dt; });
      this.particles = this.particles.filter((item) => item.life > 0);
    }

    isCollectibleVisible(item) {
      if (!item.secretId) return true;
      return Boolean(this.secrets.find((secret) => secret.id === item.secretId)?.found);
    }

    isPlatformActive(platform) {
      if (!platform.secretId) return true;
      return Boolean(this.secrets.find((secret) => secret.id === platform.secretId)?.found);
    }

    render() {
      const renderer = Park.engine.renderer;
      const ctx = renderer.ctx;
      renderer.clear(this.theme, this.time, this.level.theme);
      ctx.save();
      ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
      this.renderBackdrop(ctx);
      this.renderWorld(ctx);
      ctx.restore();
    }

    renderBackdrop(ctx) {
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      for (let i = 0; i < 9; i += 1) {
        const x = i * 430 + 80;
        ctx.beginPath();
        ctx.moveTo(x, this.height - 96);
        ctx.lineTo(x + 180, this.height - 310 - (i % 3) * 35);
        ctx.lineTo(x + 370, this.height - 96);
        ctx.closePath();
        ctx.fill();
      }
    }

    renderWorld(ctx) {
      const theme = this.theme;
      this.platforms.forEach((platform) => {
        if (!this.isPlatformActive(platform)) return;
        ctx.fillStyle = theme.terrain;
        ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = theme.terrainTop;
        ctx.fillRect(platform.x, platform.y, platform.w, Math.min(9, platform.h));
        if (platform.type === 'moving') {
          ctx.fillStyle = theme.accent;
          ctx.fillRect(platform.x + 8, platform.y + 12, platform.w - 16, 4);
        }
      });

      this.hazards.forEach((hazard) => {
        ctx.fillStyle = theme.danger;
        const count = Math.max(1, Math.round(hazard.w / 24));
        const width = hazard.w / count;
        for (let i = 0; i < count; i += 1) {
          ctx.beginPath();
          ctx.moveTo(hazard.x + i * width, hazard.y + hazard.h);
          ctx.lineTo(hazard.x + (i + 0.5) * width, hazard.y);
          ctx.lineTo(hazard.x + (i + 1) * width, hazard.y + hazard.h);
          ctx.fill();
        }
      });

      this.springs.forEach((spring) => {
        ctx.fillStyle = theme.accent;
        ctx.fillRect(spring.x - 18, spring.y - 10, 36, 10);
        ctx.fillStyle = theme.ink;
        ctx.fillRect(spring.x - 12, spring.y - 5, 24, 4);
      });

      this.secrets.forEach((secret) => {
        if (!secret.found || secret.revealTime <= 0) return;
        const alpha = Math.min(1, secret.revealTime * 1.5);
        ctx.save();
        ctx.globalAlpha = alpha * 0.24;
        ctx.fillStyle = theme.accent;
        ctx.fillRect(secret.x, secret.y, secret.w, secret.h);
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 4;
        ctx.strokeRect(secret.x + 2, secret.y + 2, secret.w - 4, secret.h - 4);
        ctx.restore();
      });

      this.collectibles.forEach((bean) => {
        if (bean.collected || !this.isCollectibleVisible(bean)) return;
        const pulse = 1 + Math.sin(this.time * 5 + bean.pulse) * 0.12;
        ctx.save();
        ctx.translate(bean.x, bean.y);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      });

      this.drawCheckpoint(ctx);
      this.drawUnlock(ctx);
      this.drawExit(ctx);
      this.drawSigns(ctx);
      this.drawEnemies(ctx);
      this.drawPlayer(ctx);

      this.particles.forEach((particle) => {
        ctx.globalAlpha = Math.min(1, particle.life * 3);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - 3, particle.y - 3, 6, 6);
      });
      ctx.globalAlpha = 1;
    }

    drawCheckpoint(ctx) {
      const item = this.checkpoint;
      ctx.fillStyle = this.theme.ink;
      ctx.fillRect(item.x - 2, item.y, 4, TILE * 2);
      ctx.fillStyle = item.active ? this.theme.accent : this.theme.haze;
      ctx.beginPath();
      ctx.moveTo(item.x + 2, item.y + 2);
      ctx.lineTo(item.x + 36, item.y + 13);
      ctx.lineTo(item.x + 2, item.y + 26);
      ctx.fill();
    }

    drawUnlock(ctx) {
      if (!this.unlockDash || this.unlockDash.collected) return;
      const item = this.unlockDash;
      ctx.save();
      ctx.translate(item.x, item.y - 20 + Math.sin(this.time * 4) * 5);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#59c7bf';
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeRect(-14, -14, 28, 28);
      ctx.restore();
    }

    drawExit(ctx) {
      const exit = this.exit;
      if (this.level.id === 'level3') {
        const cx = exit.x + exit.w / 2;
        const cy = exit.y - 70;
        ctx.strokeStyle = this.theme.accent;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, 64, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i += 1) {
          const angle = i / 8 * Math.PI * 2 + this.time * 0.15;
          ctx.fillStyle = i % 2 ? '#59c7bf' : '#f4c84a';
          ctx.fillRect(cx + Math.cos(angle) * 62 - 6, cy + Math.sin(angle) * 62 - 6, 12, 12);
        }
      }
      if (this.isFinalLevel) {
        const pulse = 0.72 + Math.sin(this.time * 5) * 0.18;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = this.theme.accent;
        ctx.fillRect(exit.x - 18, exit.y - 20, exit.w + 36, 12);
        ctx.fillStyle = this.theme.haze;
        for (let i = 0; i < 7; i += 1) {
          const bulbX = exit.x - 10 + i * ((exit.w + 20) / 6);
          ctx.beginPath();
          ctx.arc(bulbX, exit.y - 14, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.fillStyle = this.theme.ink;
      ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
      ctx.fillStyle = this.theme.accent;
      ctx.fillRect(exit.x + 8, exit.y + 8, exit.w - 16, exit.h - 8);
    }

    drawSigns(ctx) {
      this.signs.forEach((sign) => {
        const close = Math.abs((this.player.x + this.player.w / 2) - sign.x) < 110;
        ctx.fillStyle = this.theme.ink;
        ctx.fillRect(sign.x - 2, sign.y - 34, 4, 34);
        ctx.fillStyle = this.theme.haze;
        ctx.fillRect(sign.x - 22, sign.y - 50, 44, 22);
        if (close) {
          ctx.save();
          ctx.font = '700 15px "PingFang SC", sans-serif';
          const width = Math.min(360, ctx.measureText(sign.text).width + 28);
          ctx.fillStyle = 'rgba(20,26,38,.9)';
          Park.engine.renderer.roundedRect(ctx, sign.x - width / 2, sign.y - 96, width, 34, 6);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(sign.text, sign.x, sign.y - 73);
          ctx.restore();
        }
      });
    }

    drawEnemies(ctx) {
      this.enemies.forEach((enemy) => {
        if (enemy.dead) return;
        ctx.save();
        ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
        ctx.scale(enemy.direction, 1);
        ctx.fillStyle = this.theme.danger;
        Park.engine.renderer.roundedRect(ctx, -enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-9, -7, 6, 7);
        ctx.fillRect(5, -7, 6, 7);
        ctx.fillStyle = this.theme.ink;
        ctx.fillRect(-7, -5, 3, 4);
        ctx.fillRect(7, -5, 3, 4);
        ctx.restore();
      });
    }

    drawPlayer(ctx) {
      const player = this.player;
      const spriteW = this.spriteDraw.w;
      const spriteH = this.spriteDraw.h;
      this.trails.forEach((trail) => {
        ctx.save();
        ctx.globalAlpha = trail.life * 1.5;
        ctx.translate(trail.x + player.w / 2, trail.y + player.h / 2);
        ctx.scale(trail.facing, 1);
        ctx.drawImage(this.sprite, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
        ctx.restore();
      });
      ctx.save();
      ctx.globalAlpha = this.deathTimer > 0 ? Math.max(0, this.deathTimer) : 1;
      ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
      ctx.rotate(player.tilt * player.facing);
      const scaleX = player.facing * (1 + player.squash - player.stretch * 0.35);
      const scaleY = 1 - player.squash * 0.45 + player.stretch;
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(this.sprite, -spriteW / 2, -spriteH / 2, spriteW, spriteH);
      ctx.restore();
    }
  }

  Park.game.World = World;
})();
