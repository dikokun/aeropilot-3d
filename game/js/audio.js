class FlightAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.windGain = null;
    this.windFilter = null;
    this.lastWarnTime = 0;
  }

  init() {
    if (this.initialized || !this.enabled) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();

    // Twin Turboprop Engine Hum
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    const engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.value = 48;
    this.engineOsc2.frequency.value = 96.5;

    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 190;

    this.engineGain.gain.value = 0.04;

    this.engineOsc1.connect(engineFilter);
    this.engineOsc2.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();

    // Aerodynamic Wind Rush (Filtered White Noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 350;
    this.windFilter.Q.value = 0.8;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.01;

    noiseSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    noiseSource.start();

    this.initialized = true;
  }

  setEnabled(flag) {
    this.enabled = flag;
    if (!flag && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    } else if (flag && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  update(throttle, speedKnots, paused) {
    if (!this.initialized || !this.enabled) return;
    if (paused) {
      this.engineGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.08);
      this.windGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.08);
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const baseFreq = 44 + throttle * 68 + (speedKnots * 0.08);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.08);
    this.engineGain.gain.setTargetAtTime(0.035 + throttle * 0.085, now, 0.08);

    const windIntensity = Math.min(1, speedKnots / 220);
    this.windFilter.frequency.setTargetAtTime(280 + windIntensity * 850, now, 0.1);
    this.windGain.gain.setTargetAtTime(windIntensity * 0.075, now, 0.1);
  }

  playBeep(freq = 880, duration = 0.12, type = 'sine', volume = 0.12) {
    if (!this.initialized || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playRingPass() {
    this.playBeep(660, 0.10, 'triangle', 0.14);
    setTimeout(() => this.playBeep(990, 0.18, 'triangle', 0.15), 90);
  }

  playGearToggle() {
    this.playBeep(190, 0.22, 'sawtooth', 0.09);
  }

  playWarning() {
    if (!this.initialized || !this.enabled) return;
    const now = performance.now();
    if (now - this.lastWarnTime < 750) return;
    this.lastWarnTime = now;
    this.playBeep(740, 0.14, 'square', 0.09);
    setTimeout(() => this.playBeep(560, 0.16, 'square', 0.09), 160);
  }

  playTouchdown(hard = false) {
    this.playBeep(hard ? 75 : 110, 0.25, 'sine', hard ? 0.22 : 0.14);
  }
}

window.FlightAudioEngine = FlightAudioEngine;
