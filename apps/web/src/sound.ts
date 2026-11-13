/**
 * Host-screen sounds, synthesised with WebAudio so there are no files to load.
 * Browsers only let audio start after a click, so the host screen shows a
 * Sound toggle; the first tap unlocks the context.
 */
let ctx: AudioContext | null = null;
let enabled = false;
try { enabled = localStorage.getItem("va_sound") === "1"; } catch {}

export const soundEnabled = () => enabled;
export function setSound(on: boolean) {
  enabled = on;
  try { localStorage.setItem("va_sound", on ? "1" : "0"); } catch {}
  if (on) unlock();
}
export function unlock() {
  if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return; } }
  if (ctx.state === "suspended") ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.08, when = 0) {
  if (!enabled || !ctx) return;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + 0.05);
}

export const sfx = {
  tick: () => tone(1200, 0.06, "square", 0.05),
  buzzer: () => { tone(160, 0.6, "sawtooth", 0.12); tone(120, 0.6, "sawtooth", 0.12); },
  buzz: () => { tone(300, 0.12, "square", 0.1); tone(220, 0.18, "square", 0.1, 0.12); },
  got: () => { tone(880, 0.08, "square", 0.06); tone(1320, 0.1, "square", 0.06, 0.08); },
  cheer: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.08, i * 0.12)),
  youreUp: () => { tone(660, 0.1, "square", 0.08); tone(990, 0.2, "square", 0.08, 0.12); },
};
