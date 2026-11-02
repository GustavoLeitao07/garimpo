// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
import { get } from "./store.js";

let ctx;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
function tone(freq, dur = 0.12, type = "square", vol = 0.06, delay = 0, slide = 0) {
  if (!get().settings.sound) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.15, vol = 0.08) {
  if (!get().settings.sound) return;
  const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = 900; g.gain.value = vol;
  s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start();
}

const TIER_NOTES = { cascalho: [196], manjado: [220, 185], quartzo: [330, 392], esmeralda: [392, 494, 587], diamante: [523, 659, 784], pepita: [523, 659, 784, 1047] };
export const sfx = {
  click: () => tone(660, 0.05, "square", 0.04),
  dig: () => { noise(0.18, 0.1); tone(110, 0.15, "triangle", 0.08, 0, -50); },
  reject: () => { tone(160, 0.12, "sawtooth", 0.05); tone(120, 0.16, "sawtooth", 0.05, 0.1); },
  tick: () => tone(1200, 0.03, "square", 0.025),
  correction: () => tone(520, 0.08, "triangle", 0.05),
  tier: (t) => { noise(0.12, 0.06); (TIER_NOTES[t] || [150]).forEach((f, i) => tone(f, 0.16, t === "pepita" ? "triangle" : "square", 0.05, 0.08 + i * 0.09)); },
  miss: () => { tone(900, 0.05, "square", 0.05); tone(620, 0.08, "square", 0.04, 0.05); tone(140, 0.3, "triangle", 0.06, 0.1, -60); },
  scrape: () => noise(0.09, 0.05),
  pass: (i) => tone(392 + i * 70, 0.07, "square", 0.035),
  done: () => [392, 523, 659, 784, 659, 784].forEach((f, i) => tone(f, 0.14, "triangle", 0.05, i * 0.1)),
};
export const unlockAudio = () => ac();
