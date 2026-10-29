/**
 * Little sounds, drawn by the browser (no audio file): "pop" when a scoop is
 * placed, "ding" when an order arrives, "tada" when a tub goes back in the
 * freezer or everyone is served. Off unless the host turns them on in Moi.
 */
export type Sound = "pop" | "ding" | "tada";

const STORAGE_KEY = "glacify-sounds";

export function soundsOn() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundsOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  if (on) play("pop", true);
}

let ctx: AudioContext | null = null;

/** One note: a sine (or triangle) that starts at `from` Hz, glides to `to` and fades out */
function note(ac: AudioContext, at: number, from: number, to: number, length: number, volume: number, type: OscillatorType = "sine") {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + length * 0.6);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

export function play(sound: Sound, force = false) {
  if (!force && !soundsOn()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime + 0.01;
    if (sound === "pop") note(ctx, t, 520, 900, 0.12, 0.25);
    else if (sound === "ding") {
      note(ctx, t, 1318, 1318, 0.9, 0.18);
      note(ctx, t + 0.12, 1760, 1760, 0.9, 0.12);
    } else {
      [523, 659, 784, 1046].forEach((f, i) => note(ctx!, t + i * 0.09, f, f, i === 3 ? 0.6 : 0.2, 0.16, "triangle"));
    }
  } catch {
    /* no audio here */
  }
}
