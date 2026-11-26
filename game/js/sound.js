// AeroPilot V8 — procedural sound: engine hum, ring chime, touchdown thud.
// Everything is synthesised with WebAudio; there are no audio assets.

(function () {
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.engineOsc = null;
      this.engineGain = null;
      this.warnOsc = null;
    }

    ensure() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    }

    setEngine(throttle, iasKt) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(0.015 + throttle * 0.06, t, 0.1);
      this.engineOsc.frequency.setTargetAtTime(50 + throttle * 65 + iasKt * 0.12, t, 0.1);
    }

    blip(freq, dur, gain, type) {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + dur);
    }

    ring() { this.blip(880, 0.18, 0.12); setTimeout(() => this.blip(1318, 0.24, 0.1), 70); }
    touchdown(hard) { this.blip(hard ? 90 : 130, 0.22, 0.22, 'triangle'); }
    warn(on) {
      if (!this.ctx) return;
      if (on && !this.warnOsc) {
        this.warnOsc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        this.warnOsc.type = 'square';
        this.warnOsc.frequency.value = 740;
        g.gain.value = 0.015;
        this.warnOsc.connect(g); g.connect(this.ctx.destination);
        this.warnOsc.start();
        this.warnOsc._gain = g;
      } else if (!on && this.warnOsc) {
        try { this.warnOsc.stop(); } catch (e) { /* already stopped */ }
        this.warnOsc = null;
      }
    }
    silence() {
      if (this.engineGain && this.ctx) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.warn(false);
    }
  }

  window.SoundFX = SoundFX;
})();
