// @owner codex
(function () {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) context = new AudioContext();
    }
    return context;
  }

  function tone(frequency, duration, type, volume, delay) {
    const audio = ensure();
    if (!audio || muted) return;
    const start = audio.currentTime + (delay || 0);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.08, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  const sounds = {
    jump() { tone(300, 0.12, 'square', 0.055); tone(470, 0.1, 'square', 0.04, 0.04); },
    dash() { tone(180, 0.16, 'sawtooth', 0.045); tone(360, 0.1, 'triangle', 0.04, 0.04); },
    land() { tone(150, 0.06, 'square', 0.025); tone(260, 0.07, 'triangle', 0.02, 0.02); },
    bean() { tone(650, 0.08, 'sine', 0.09); tone(900, 0.13, 'sine', 0.07, 0.05); },
    secret() { [392, 587, 784].forEach((value, index) => tone(value, 0.2, 'sine', 0.06, index * 0.07)); },
    checkpoint() { [440, 554, 660].forEach((value, index) => tone(value, 0.16, 'sine', 0.07, index * 0.07)); },
    hurt() { tone(180, 0.22, 'sawtooth', 0.055); tone(90, 0.25, 'square', 0.035, 0.06); },
    stomp() { tone(120, 0.08, 'square', 0.06); tone(350, 0.1, 'triangle', 0.05, 0.03); },
    spring() { tone(250, 0.08, 'square', 0.05); tone(700, 0.18, 'sine', 0.06, 0.04); },
    unlock() { [392, 523, 659, 784].forEach((value, index) => tone(value, 0.2, 'sine', 0.065, index * 0.09)); },
    win() { [523, 659, 784, 1046].forEach((value, index) => tone(value, 0.24, 'sine', 0.075, index * 0.11)); }
  };

  Park.engine.audio = {
    sounds,
    resume() { const audio = ensure(); if (audio && audio.state === 'suspended') audio.resume(); },
    setMuted(value) { muted = Boolean(value); },
    isMuted() { return muted; }
  };
})();
