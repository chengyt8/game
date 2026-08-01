// @owner codex
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function buildSprite(data, beadSize) {
    if (data.image) {
      const sprite = document.createElement('canvas');
      sprite.width = data.texture?.w || 256;
      sprite.height = data.texture?.h || 256;
      const target = sprite.getContext('2d');
      const image = new Image();
      image.addEventListener('load', () => {
        target.imageSmoothingEnabled = true;
        target.clearRect(0, 0, sprite.width, sprite.height);
        target.drawImage(image, 0, 0, sprite.width, sprite.height);
      });
      image.src = data.image;
      return sprite;
    }
    const sprite = document.createElement('canvas');
    sprite.width = data.grid[0].length * beadSize;
    sprite.height = data.grid.length * beadSize;
    const target = sprite.getContext('2d');
    target.imageSmoothingEnabled = false;
    data.grid.forEach((row, y) => row.forEach((key, x) => {
      if (!key) return;
      target.fillStyle = data.palette[key];
      target.fillRect(x * beadSize, y * beadSize, beadSize, beadSize);
      target.fillStyle = 'rgba(255,255,255,.16)';
      target.fillRect(x * beadSize, y * beadSize, beadSize, 1);
      target.fillStyle = 'rgba(0,0,0,.16)';
      target.fillRect(x * beadSize, y * beadSize + beadSize - 1, beadSize, 1);
    }));
    return sprite;
  }

  function roundedRect(context, x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    context.beginPath();
    context.roundRect(x, y, w, h, r);
  }

  function clear(theme, time, themeId) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, theme.sky);
    gradient.addColorStop(0.72, theme.haze);
    gradient.addColorStop(1, theme.terrainTop);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (themeId === 'night') {
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      for (let i = 0; i < 45; i += 1) {
        const x = (i * 193) % canvas.width;
        const y = (i * 71) % 260;
        const size = i % 5 === 0 ? 2 : 1;
        ctx.fillRect(x, y, size, size);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.34)';
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 220 - time * (8 + i)) % 1250) - 120;
        const y = 70 + (i % 3) * 65;
        ctx.beginPath();
        ctx.ellipse(x, y, 65, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  Park.engine.renderer = { canvas, ctx, buildSprite, roundedRect, clear };
})();
