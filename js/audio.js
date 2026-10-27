/* ===================================================================
 *  SOM — efeitos 8-bit gerados na hora com a Web Audio API
 * -------------------------------------------------------------------
 *  Nenhum arquivo de áudio é baixado: cada efeito é montado com
 *  osciladores (ondas quadrada/triangular/senoidal) e ruído branco.
 * =================================================================== */

const STORAGE_KEY = 'arcade:muted';
const VOLUME = 0.35;

let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = readMuted();

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const isMuted = () => muted;

export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // sem localStorage (ex.: aba anônima): a escolha vale só nesta visita
  }
}

/** Devolve o AudioContext, criado só no primeiro som (o navegador exige um clique antes). */
function audio() {
  if (muted) return null;
  // Antes de qualquer interação o navegador bloquearia o som: nem tenta
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;

  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/**
 * Uma nota.
 *   type  'square' | 'triangle' | 'sine' | 'sawtooth'
 *   freq  frequência inicial em Hz; `to` = frequência final (glissando)
 *   at    atraso em segundos · dur = duração · vol = volume (0 a 1)
 */
function tone({ type = 'square', freq, to = freq, at = 0, dur = 0.1, vol = 0.2 }) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/**
 * Ruído filtrado (chiado, estalos, cliques).
 *   filter  tipo do filtro: 'lowpass' (grave), 'highpass' (agudo), 'bandpass'
 *   hold    segundos com volume cheio antes de começar a sumir
 */
function noise({ at = 0, dur = 0.2, hold = 0, vol = 0.3, filter = 'bandpass', freq = 1200, q = 0.8 }) {
  const ac = audio();
  if (!ac) return;

  if (!noiseBuffer) {
    // 1 segundo de ruído; cada valor se repete 3 amostras = som mais "8-bit"
    noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 3 === 0 ? Math.random() * 2 - 1 : data[i - 1];
    }
  }

  const t = ac.currentTime + at;
  const source = ac.createBufferSource();
  const biquad = ac.createBiquadFilter();
  const gain = ac.createGain();

  source.buffer = noiseBuffer;
  source.loop = true;
  biquad.type = filter;
  biquad.frequency.value = freq;
  biquad.Q.value = q;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.setValueAtTime(vol, t + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  source.connect(biquad).connect(gain).connect(master);
  source.start(t, Math.random() * 0.5);
  source.stop(t + dur + 0.02);
}

/** Catálogo de efeitos usados pelo site. */
export const sfx = {
  /** Tirou o cartucho da estante */
  pickup() {
    tone({ freq: 392, to: 784, dur: 0.08, vol: 0.12 });
  },

  /** Arraste passou por cima do console */
  target() {
    tone({ freq: 1047, dur: 0.05, vol: 0.07 });
  },

  /** Soltou fora do console: o cartucho volta */
  cancel() {
    tone({ type: 'triangle', freq: 600, to: 220, dur: 0.15, vol: 0.18 });
  },

  /** Cartucho encaixando: "ká-tchunk" */
  insert() {
    noise({ dur: 0.05, vol: 0.5, filter: 'lowpass', freq: 2500 });
    tone({ freq: 160, to: 55, at: 0.04, dur: 0.12, vol: 0.26 });
    noise({ at: 0.06, dur: 0.1, vol: 0.4, filter: 'lowpass', freq: 600 });
  },

  /** TV ligando: "tum" do tubo + chiado de estática */
  powerOn() {
    tone({ type: 'sine', freq: 90, to: 40, dur: 0.28, vol: 0.45 });
    noise({ at: 0.04, dur: 1.05, hold: 0.6, vol: 0.16, filter: 'bandpass', freq: 3200, q: 0.6 });
  },

  /** Vinheta da tela de boot (arpejo dó-mi-sol-dó) */
  boot() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone({ freq, at: i * 0.075, dur: 0.12, vol: 0.11 }));
    tone({ type: 'triangle', freq: 1567.98, at: 0.3, dur: 0.4, vol: 0.13 });
    tone({ type: 'triangle', freq: 130.81, dur: 0.6, vol: 0.2 });
  },

  /** Apertou START */
  start() {
    [783.99, 1046.5, 1567.98].forEach((freq, i) => tone({ freq, at: i * 0.06, dur: i === 2 ? 0.22 : 0.07, vol: 0.12 }));
  },

  /** Ejetar: clique da trava + "boing" da mola */
  eject() {
    noise({ dur: 0.04, vol: 0.4, filter: 'highpass', freq: 1500 });
    tone({ freq: 220, to: 880, at: 0.02, dur: 0.09, vol: 0.14 });
    tone({ type: 'triangle', freq: 880, to: 260, at: 0.11, dur: 0.2, vol: 0.18 });
  },

  /** TV desligando: "piuuu" descendo */
  powerOff() {
    tone({ type: 'sine', freq: 1400, to: 60, dur: 0.32, vol: 0.18 });
    noise({ dur: 0.12, vol: 0.1, filter: 'highpass', freq: 4000 });
  },

  /** Cartucho de volta na prateleira */
  land() {
    tone({ type: 'triangle', freq: 300, to: 150, dur: 0.07, vol: 0.16 });
    noise({ dur: 0.04, vol: 0.2, filter: 'lowpass', freq: 1200 });
  },

  /** Cursor andando entre os botões da TV */
  move() {
    tone({ freq: 880, dur: 0.035, vol: 0.06 });
  },

  /** Ação impossível (ex.: START sem cartucho) */
  denied() {
    tone({ freq: 140, dur: 0.12, vol: 0.12 });
    tone({ freq: 110, at: 0.12, dur: 0.16, vol: 0.12 });
  },
};
