// Procedural audio: turboprop bed, GPWS beeps, ring chime, touchdown thud.
export const Sfx = {
  ctx: null, engGain: null, engOsc: null, engOsc2: null, engFilter: null,
  init() {
    if (this.ctx) return;
    try {
      const C = new (window.AudioContext || window.webkitAudioContext)();
      this.ctx = C;
      this.engGain = C.createGain(); this.engGain.gain.value = 0;
      this.engFilter = C.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 300;
      this.engOsc = C.createOscillator(); this.engOsc.type = 'sawtooth'; this.engOsc.frequency.value = 62;
      this.engOsc2 = C.createOscillator(); this.engOsc2.type = 'sawtooth'; this.engOsc2.frequency.value = 93.5;
      const g2 = C.createGain(); g2.gain.value = 0.5;
      this.engOsc.connect(this.engFilter); this.engOsc2.connect(g2); g2.connect(this.engFilter);
      this.engFilter.connect(this.engGain); this.engGain.connect(C.destination);
      this.engOsc.start(); this.engOsc2.start();
    } catch (e) { /* audio unavailable */ }
  },
  engine(throttle, speed) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.setTargetAtTime(0.015 + throttle * 0.075, t, 0.12);
    this.engFilter.frequency.setTargetAtTime(240 + throttle * 720 + speed * 2, t, 0.15);
    this.engOsc.frequency.setTargetAtTime(58 + throttle * 44, t, 0.2);
    this.engOsc2.frequency.setTargetAtTime(87 + throttle * 66, t, 0.2);
  },
  beep(freq = 880, dur = 0.12, vol = 0.12, when = 0) {
    if (!this.ctx) return;
    const C = this.ctx, t = C.currentTime + when;
    const o = C.createOscillator(), g = C.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(C.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },
  gpws() { this.beep(620, 0.14, 0.14); this.beep(620, 0.14, 0.14, 0.2); },
  ring() { this.beep(1180, 0.1, 0.1); this.beep(1560, 0.16, 0.1, 0.09); },
  chime() { this.beep(990, 0.12, 0.1); this.beep(1320, 0.2, 0.1, 0.11); },
  servo() { this.beep(220, 0.3, 0.05); },
  thud() {
    if (!this.ctx) return;
    const C = this.ctx, t = C.currentTime;
    const o = C.createOscillator(), g = C.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    o.connect(g); g.connect(C.destination);
    o.start(t); o.stop(t + 0.3);
  }
};
