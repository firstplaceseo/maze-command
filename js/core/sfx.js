// Tiny synthesised sound effects. No audio files needed.
window.TD = window.TD || {};

TD.SFX = (function () {
  let ctx = null, master = null, muted = false;
  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    return true;
  }
  function unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }
  function noise(dur, freq, vol) {
    if (muted || !ensure()) return;
    const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  function tone(freq, dur, type, vol, slide) {
    if (muted || !ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  let lastShot = 0;
  return {
    unlock,
    toggle() { muted = !muted; return muted; },
    isMuted() { return muted; },
    shoot(tier) { const now = Date.now(); if (now - lastShot < 40) return; lastShot = now; noise(0.08, 1200 + tier * 300, 0.5); },
    explode() { noise(0.45, 400, 0.9); tone(70, 0.4, 'sine', 0.4, 30); },
    build() { tone(320, 0.08, 'square', 0.15); setTimeout(() => tone(480, 0.1, 'square', 0.15), 90); },
    done() { tone(520, 0.1, 'triangle', 0.2); setTimeout(() => tone(780, 0.15, 'triangle', 0.2), 100); },
    horn() { tone(160, 0.5, 'sawtooth', 0.25); setTimeout(() => tone(200, 0.6, 'sawtooth', 0.25), 250); },
    leak() { tone(200, 0.3, 'square', 0.25, 90); },
    deny() { tone(140, 0.12, 'square', 0.2); },
    gold() { tone(900, 0.06, 'triangle', 0.12); },
  };
})();
