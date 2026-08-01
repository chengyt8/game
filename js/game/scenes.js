// @owner codex
(function () {
  class App {
    constructor(content) {
      this.content = content;
      this.save = Park.engine.storage.load(content.levelOrder);
      Park.engine.audio.setMuted(this.save.settings.muted);
      this.world = null;
      this.mode = 'menu';
      this.levelId = null;
      this.resumeMode = null;
      this.toastTimer = 0;
      this.dom = {
        shell: document.getElementById('game-shell'),
        overlay: document.getElementById('overlay'),
        title: document.getElementById('overlay-title'),
        copy: document.getElementById('overlay-copy'),
        help: document.getElementById('controls-help'),
        endlessHelp: document.getElementById('endless-controls-help'),
        helpToggle: document.getElementById('controls-toggle'),
        panel: document.querySelector('.overlay-panel'),
        actions: document.getElementById('overlay-actions'),
        level: document.getElementById('hud-level'),
        beans: document.getElementById('hud-beans'),
        toast: document.getElementById('toast'),
        pause: document.getElementById('pause-button'),
        mute: document.getElementById('mute-button')
      };
      this.dom.pause.addEventListener('click', () => this.togglePause());
      this.dom.mute.addEventListener('click', () => this.toggleMute());
      this.dom.helpToggle.addEventListener('click', () => this.toggleControlsHelp());
      this.updateMuteButton();
      this.showMenu();
    }

    button(label, onClick, options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.disabled = Boolean(options?.disabled);
      if (options?.secondary) button.classList.add('secondary');
      if (options?.className) button.classList.add(...options.className.split(' '));
      button.addEventListener('click', () => { Park.engine.audio.resume(); onClick(); });
      return button;
    }

    levelButton(id, index) {
      const level = this.content.levels[id];
      const unlocked = index + 1 <= this.save.progress.unlockedLevel;
      const stars = this.save.progress.bestStars[id] || 0;
      const button = this.button('', () => this.startLevel(id), {
        disabled: !unlocked,
        className: `level-card${index === this.content.levelOrder.length - 1 ? ' final-level-card' : ''}`
      });
      const theme = this.content.themes[level.theme];
      button.style.setProperty('--level-sky', theme.sky);
      button.style.setProperty('--level-accent', theme.accent);
      button.setAttribute('aria-label', unlocked ? `${level.title}，${stars ? `最佳 ${stars} 星` : '尚未通关'}` : `${level.title}，尚未解锁`);

      const number = document.createElement('span');
      number.className = 'level-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const copy = document.createElement('span');
      copy.className = 'level-card-copy';
      const title = document.createElement('strong');
      title.textContent = level.title;
      const status = document.createElement('small');
      status.textContent = unlocked ? (stars ? `最佳 ${'★'.repeat(stars)}` : '可以出发') : '完成上一关解锁';
      const swatch = document.createElement('span');
      swatch.className = 'level-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      copy.append(title, status);
      button.append(number, copy, swatch);
      return button;
    }

    endlessButton() {
      const config = this.content.modes.endless;
      const unlockIndex = this.content.levelOrder.indexOf(config.unlockAfterLevel) + 2;
      const unlocked = this.save.progress.unlockedLevel >= unlockIndex;
      const best = this.save.progress.bestEndlessScore || 0;
      const button = this.button('', () => this.startEndless(), {
        disabled: !unlocked,
        className: 'mode-card endless-card'
      });
      button.setAttribute('aria-label', unlocked
        ? `${config.title}，${best ? `最高分 ${best}` : '尚无记录'}`
        : `${config.title}，通关 ${this.content.levels[config.unlockAfterLevel].title} 后解锁`);
      const marker = document.createElement('span');
      marker.className = 'mode-marker';
      marker.textContent = '∞';
      marker.setAttribute('aria-hidden', 'true');
      const copy = document.createElement('span');
      copy.className = 'level-card-copy';
      const title = document.createElement('strong');
      title.textContent = config.title;
      const status = document.createElement('small');
      status.textContent = unlocked
        ? (best ? `最高分 ${best}` : '踩稳楼梯，向下转移')
        : `通关${this.content.levels[config.unlockAfterLevel].title}后解锁`;
      copy.append(title, status);
      button.append(marker, copy);
      return button;
    }

    showOverlay(title, copy, buttons, options) {
      this.dom.title.innerHTML = title;
      this.dom.copy.textContent = copy;
      this.dom.actions.replaceChildren(...buttons);
      const controlsMode = options?.controlsMode || (options?.showControls ? 'shown' : 'hidden');
      const showControls = controlsMode === 'shown';
      const showEndlessControls = controlsMode === 'endless';
      this.dom.help.hidden = !showControls;
      this.dom.endlessHelp.hidden = !showEndlessControls;
      this.dom.helpToggle.hidden = controlsMode !== 'toggle';
      this.dom.helpToggle.setAttribute('aria-expanded', String(showControls));
      this.dom.helpToggle.setAttribute('aria-label', '查看操作说明');
      this.dom.helpToggle.title = '查看操作说明';
      this.dom.panel.classList.toggle('has-controls', showControls || showEndlessControls);
      this.dom.panel.classList.toggle('is-level-menu', options?.layout === 'levels');
      this.dom.panel.classList.toggle('is-finale', Boolean(options?.finale));
      this.dom.actions.classList.toggle('level-grid', options?.layout === 'levels');
      this.dom.overlay.classList.add('is-visible');
    }

    toggleControlsHelp() {
      const show = this.dom.help.hidden;
      this.dom.help.hidden = !show;
      this.dom.helpToggle.setAttribute('aria-expanded', String(show));
      this.dom.helpToggle.setAttribute('aria-label', show ? '收起操作说明' : '查看操作说明');
      this.dom.helpToggle.title = show ? '收起操作说明' : '查看操作说明';
      this.dom.panel.classList.toggle('has-controls', show);
    }

    hideOverlay() { this.dom.overlay.classList.remove('is-visible'); }

    showMenu() {
      this.mode = 'menu';
      this.world = null;
      this.levelId = null;
      this.dom.shell.classList.remove('endless-mode');
      this.dom.level.textContent = '入口广场';
      this.dom.beans.textContent = '彩豆 0/0';
      const buttons = this.content.levelOrder.map((id, index) => this.levelButton(id, index));
      buttons.push(this.endlessButton());
      this.showOverlay('拼豆小牛<br>乐园大冒险', '选一站，继续跑。', buttons, {
        controlsMode: 'toggle',
        layout: 'levels'
      });
    }

    startLevel(id) {
      this.levelId = id;
      this.mode = 'playing';
      this.dom.shell.classList.remove('endless-mode');
      this.hideOverlay();
      this.world = new Park.game.World(this.content.levels[id], this.content, this.save, {
        hud: (data) => this.updateHud(data),
        toast: (text) => this.toast(text),
        complete: (result) => this.finishLevel(result)
      });
    }

    startEndless() {
      this.levelId = null;
      this.mode = 'endless';
      this.dom.shell.classList.add('endless-mode');
      this.hideOverlay();
      this.world = new Park.game.EndlessWorld(this.content.modes.endless, this.content, {
        hud: (data) => this.updateEndlessHud(data),
        restart: () => this.startEndless(),
        complete: (result) => this.finishEndless(result)
      });
    }

    finishEndless(result) {
      this.mode = 'endless-complete';
      const previousBest = this.save.progress.bestEndlessScore || 0;
      const isBest = result.score > previousBest;
      this.save.progress.bestEndlessScore = Math.max(previousBest, result.score);
      Park.engine.storage.save(this.save);
      const summary = `${result.reason}。坚持 ${result.time.toFixed(1)} 秒 · 彩豆 ${result.beans} · ${result.score} 分`;
      this.showOverlay(isBest ? '新的最高分' : '无尽楼梯结束', summary, [
        this.button('再来一次', () => this.startEndless()),
        this.button('返回选关', () => this.showMenu(), { secondary: true })
      ], { finale: isBest });
    }

    finishLevel(result) {
      this.mode = 'complete';
      const index = this.content.levelOrder.indexOf(this.levelId);
      this.save.progress.bestStars[this.levelId] = Math.max(this.save.progress.bestStars[this.levelId] || 0, result.stars);
      this.save.progress.unlockedLevel = Math.max(
        this.save.progress.unlockedLevel,
        Math.min(this.content.levelOrder.length, index + 2)
      );
      Park.engine.storage.save(this.save);
      const finalLevel = index === this.content.levelOrder.length - 1;
      const buttons = [
        this.button(finalLevel ? '再跑一次' : '下一关', () => this.startLevel(finalLevel ? this.levelId : this.content.levelOrder[index + 1])),
        this.button('返回选关', () => this.showMenu(), { secondary: true })
      ];
      const copy = finalLevel
        ? `${this.content.levels[this.levelId].title}亮起来了。彩豆 ${result.collected}/${result.total}`
        : `彩豆 ${result.collected}/${result.total} · ${'★'.repeat(result.stars)}`;
      this.showOverlay(finalLevel ? '整座乐园<br>亮起来了' : '顺利抵达', copy, buttons, { finale: finalLevel });
    }

    togglePause() {
      if (this.mode === 'playing' || this.mode === 'endless') {
        this.resumeMode = this.mode;
        this.mode = 'paused';
        const endless = this.resumeMode === 'endless';
        this.showOverlay('暂停', '喘口气，随时继续。', [
          this.button('继续', () => this.togglePause()),
          this.button(endless ? '重新开始挑战' : '重新开始本关', () => endless ? this.startEndless() : this.startLevel(this.levelId), { secondary: true }),
          this.button('返回选关', () => this.showMenu(), { secondary: true })
        ], { controlsMode: endless ? 'endless' : 'shown' });
      } else if (this.mode === 'paused') {
        this.mode = this.resumeMode;
        this.hideOverlay();
      }
    }

    toggleMute() {
      this.save.settings.muted = !this.save.settings.muted;
      Park.engine.audio.setMuted(this.save.settings.muted);
      Park.engine.storage.save(this.save);
      this.updateMuteButton();
      this.toast(this.save.settings.muted ? '已静音' : '声音已开启');
    }

    updateMuteButton() {
      this.dom.mute.textContent = this.save.settings.muted ? '×' : '♪';
      this.dom.mute.setAttribute('aria-label', this.save.settings.muted ? '开启声音' : '静音');
      this.dom.mute.title = this.save.settings.muted ? '开启声音' : '静音';
    }

    updateHud(data) {
      this.dom.level.textContent = data.level;
      this.dom.beans.textContent = `豆 ${data.collected}/${data.total} · 秘 ${data.secretsFound}/${data.secretsTotal}`;
    }

    updateEndlessHud(data) {
      this.dom.level.textContent = `无尽坠落 ${data.time.toFixed(1)}s`;
      this.dom.beans.textContent = `分数 ${data.score} · 彩豆 ${data.beans}`;
    }

    toast(text) {
      this.dom.toast.textContent = text;
      this.dom.toast.classList.add('is-visible');
      this.toastTimer = 2.2;
    }

    update(dt) {
      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) this.dom.toast.classList.remove('is-visible');
      }
      const input = Park.engine.input.state();
      if (input.mutePressed) this.toggleMute();
      if (input.pausePressed) this.togglePause();
      if ((this.mode === 'playing' || this.mode === 'endless') && this.world) this.world.update(dt, input);
      if (this.mode === 'endless-complete' && input.restartPressed) this.startEndless();
    }

    render() {
      if (this.world) this.world.render();
      else Park.engine.renderer.clear(this.content.themes.day, performance.now() / 1000, 'menu');
    }
  }

  Park.game.App = App;
})();
