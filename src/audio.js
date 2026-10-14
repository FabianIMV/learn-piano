// Motor de sonido. Usa grabaciones de un piano de cola (Salamander Grand Piano)
// y, si no se pueden cargar, un piano sintetizado como respaldo.

const SAMPLE_NOTES = { C3: 48, Ds3: 51, Fs3: 54, A3: 57, C4: 60, Ds4: 63, Fs4: 66, A4: 69, C5: 72, Ds5: 75, Fs5: 78, A5: 81, C6: 84, Ds6: 87 };
const SAMPLE_URL = (name) => new URL(`../assets/piano/${name}.mp3`, import.meta.url);

const RELEASE = 0.35;    // segundos que tarda en apagarse una nota al soltarla
const MAX_LENGTH = 6;    // ninguna nota suena más que esto
const STRUM = 0.018;     // pequeño desfase entre notas de un acorde, como al tocarlo con la mano

const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class Piano {
  constructor() {
    this.ctx = null;
    this.samples = new Map(); // midi -> AudioBuffer
    this.status = 'idle';     // idle | loading | ready | synth
    this.chordVoices = [];
    this.onStatus = () => {};
  }

  /** Crea el contexto de audio y empieza a cargar las grabaciones. */
  load() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return this.setStatus('unsupported');
    this.ctx = new Ctx({ latencyHint: 'interactive' });
    this.buildOutput();
    this.setStatus('loading');

    Promise.all(Object.entries(SAMPLE_NOTES).map(async ([name, midi]) => {
      const response = await fetch(SAMPLE_URL(name));
      if (!response.ok) throw new Error(`${response.status} al cargar ${name}`);
      const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      this.samples.set(midi, buffer);
    }))
      .then(() => this.setStatus('ready'))
      .catch((error) => {
        console.warn('No se pudo cargar el piano grabado; se usará el sintetizado.', error);
        this.samples.clear();
        this.setStatus('synth');
      });
  }

  setStatus(status) {
    this.status = status;
    this.onStatus(status);
  }

  /** Los navegadores solo permiten sonar después de una interacción del usuario. */
  unlock() {
    this.load();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  buildOutput() {
    const ctx = this.ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 0.8;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.25;

    // Reverb corta de sala: ruido que decae, generado una sola vez.
    const length = Math.floor(ctx.sampleRate * 1.8);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    const reverb = ctx.createConvolver();
    reverb.buffer = impulse;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.14;

    this.output.connect(compressor);
    this.output.connect(this.reverbSend);
    this.reverbSend.connect(reverb);
    reverb.connect(compressor);
    compressor.connect(ctx.destination);
  }

  /** Toca una nota. Devuelve una función para soltarla. */
  playNote(midi, { when = 0, velocity = 0.8 } = {}) {
    this.unlock();
    if (!this.ctx) return () => {};
    const start = this.ctx.currentTime + 0.01 + when;
    return this.samples.size ? this.playSample(midi, start, velocity) : this.playSynth(midi, start, velocity);
  }

  playSample(midi, start, velocity) {
    const ctx = this.ctx;
    const nearest = [...this.samples.keys()].reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
    const source = ctx.createBufferSource();
    source.buffer = this.samples.get(nearest);
    source.playbackRate.value = 2 ** ((midi - nearest) / 12);

    // Las notas suaves suenan más opacas, como en un piano real.
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800 + 9000 * velocity;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(velocity ** 1.5, start);

    source.connect(tone).connect(gain).connect(this.output);
    source.start(start);
    source.stop(start + MAX_LENGTH);
    return this.releaser(gain, source, start);
  }

  playSynth(midi, start, velocity) {
    // Síntesis aditiva: armónicos que decaen más rápido cuanto más agudos.
    const ctx = this.ctx;
    const freq = midiToFreq(midi);
    const gain = ctx.createGain();
    gain.gain.value = velocity * 0.22;
    gain.connect(this.output);

    const oscillators = [1, 2, 3, 4, 5, 6].map((n, i) => {
      const osc = ctx.createOscillator();
      const partial = ctx.createGain();
      osc.frequency.value = n * freq * Math.sqrt(1 + 0.0004 * n * n); // ligera inarmonía de cuerda
      const level = [1, 0.5, 0.3, 0.18, 0.1, 0.06][i];
      partial.gain.setValueAtTime(0, start);
      partial.gain.linearRampToValueAtTime(level, start + 0.005);
      partial.gain.exponentialRampToValueAtTime(level * 0.35, start + 0.4 / n);
      partial.gain.exponentialRampToValueAtTime(0.0001, start + 4 / n);
      osc.connect(partial).connect(gain);
      osc.start(start);
      osc.stop(start + MAX_LENGTH);
      return osc;
    });
    return this.releaser(gain, oscillators, start);
  }

  releaser(gain, sources, start) {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const t = Math.max(this.ctx.currentTime, start);
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.setTargetAtTime(0, t, RELEASE / 4);
      for (const s of [sources].flat()) s.stop(t + RELEASE * 2);
    };
  }

  /** Toca un acorde y suelta el anterior, como al cambiar de posición en el teclado. */
  playChord(midis, { arpeggio = false } = {}) {
    this.releaseChord();
    const sorted = [...midis].sort((a, b) => a - b);
    const gap = arpeggio ? 0.32 : STRUM;
    this.chordVoices = sorted.map((midi, i) =>
      this.playNote(midi, { when: i * gap, velocity: 0.62 + Math.random() * 0.1 - (i === 0 ? 0 : 0.04) }));
  }

  releaseChord() {
    this.chordVoices.forEach((release) => release());
    this.chordVoices = [];
  }

  /** Clic de metrónomo, corto y discreto. */
  click(accent = false) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1760 : 1320;
    gain.gain.setValueAtTime(accent ? 0.12 : 0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }
}
