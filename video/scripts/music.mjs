// Original background music + sound design for the promo, synthesized from scratch (no samples).
// Released as CC0 (public domain) together with this repo's video sources.
//
// Warm pad (Fmaj9 - Am7 - Dm9 - Bbmaj9), sub bass, soft kick/hats, a plucked arpeggio and a few
// whooshes/impacts placed on voiceover cues from src/words.json.
//
// Usage: node scripts/music.mjs  ->  out/music.wav (48 kHz stereo, 16-bit)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"

const root = new URL("..", import.meta.url).pathname
const { words, duration } = JSON.parse(readFileSync(`${root}src/words.json`, "utf8"))
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "")
const cue = (w, nth = 0) => words.filter((x) => norm(x.w) === norm(w))[nth].s

const SR = 48000
const LEN = Math.ceil((duration + 0.2) * SR)
const L = new Float32Array(LEN)
const R = new Float32Array(LEN)
const verbSend = new Float32Array(LEN)

const BPM = 100
const BEAT = 60 / BPM
const BAR = BEAT * 4
// Bar 1 lands on "Make it count" so the groove starts with the second line.
const T0 = cue("Make") - BAR
const DRUMS_IN = cue("Make")
const DRUMS_OUT = cue("Caption") - 0.15
const LOGO_HIT = cue("Saywhat", 1)

const mtof = (m) => 440 * 2 ** ((m - 69) / 12)
const CHORDS = [
  [53, 57, 60, 64, 67], // Fmaj9 (F A C E G)
  [57, 60, 64, 67, 71], // Am7(add9-ish)
  [50, 57, 60, 64, 65], // Dm9
  [46, 53, 57, 60, 62], // Bbmaj9
]
const ROOTS = [41, 45, 38, 46]

// --- tiny DSP helpers
let seed = 1
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
const TABLE = 4096
const SAW = new Float32Array(TABLE) // band-limited saw (12 harmonics)
for (let i = 0; i < TABLE; i++) for (let h = 1; h <= 12; h++) SAW[i] += Math.sin((2 * Math.PI * h * i) / TABLE) / h / 1.7
const lookup = (tbl, ph) => tbl[Math.floor((ph - Math.floor(ph)) * TABLE)]
const add = (i, v, pan = 0) => {
  if (i < 0 || i >= LEN) return
  L[i] += v * (1 - pan) * 0.5 * 2 ** 0.5
  R[i] += v * (1 + pan) * 0.5 * 2 ** 0.5
}
const smooth = (x) => x * x * (3 - 2 * x)
const barAt = (t) => Math.floor((t - T0) / BAR)

// Sidechain "pump": dips pad/bass right after each kick.
const pump = (t) => {
  if (t < DRUMS_IN || t > DRUMS_OUT) return 1
  const since = (t - T0) % (BEAT * 2)
  return 0.55 + 0.45 * smooth(Math.min(1, since / 0.3))
}

// --- pad: one voice per chord tone, 3 detuned saws, chord crossfades
{
  const lp = [
    [0, 0],
    [0, 0],
  ]
  const nBars = Math.ceil((duration - T0) / BAR) + 1
  for (let b = -1; b < nBars; b++) {
    const chord = CHORDS[((b % 4) + 4) % 4]
    const start = T0 + b * BAR
    const s0 = Math.max(0, Math.floor((start - 0.5) * SR))
    const s1 = Math.min(LEN, Math.floor((start + BAR + 1.5) * SR))
    chord.forEach((m, vi) => {
      const f = mtof(m)
      const det = [-0.006, 0, 0.0065]
      const ph = det.map(() => (noise() + 1) / 2)
      for (let i = s0; i < s1; i++) {
        const t = i / SR
        const rel = t - start
        const env = rel < 0 ? smooth(Math.max(0, (rel + 0.5) / 0.5)) : rel < BAR ? 1 : Math.max(0, 1 - (rel - BAR) / 1.5)
        let v = 0
        det.forEach((d, k) => {
          ph[k] += (f * (1 + d)) / SR
          v += lookup(SAW, ph[k])
        })
        add(i, v * env * 0.03, (vi / (chord.length - 1)) * 1.2 - 0.6)
      }
    })
  }
  // 2-pole lowpass on the summed pad, cutoff breathing slowly; applied in place
  for (let i = 0; i < LEN; i++) {
    const t = i / SR
    const fc = 1500 + 500 * Math.sin(t * 0.35) + (t > DRUMS_IN ? 900 : 0)
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR)
    const p = pump(t)
    for (const [ch, buf] of [
      [0, L],
      [1, R],
    ]) {
      lp[ch][0] += a * (buf[i] - lp[ch][0])
      lp[ch][1] += a * (lp[ch][0] - lp[ch][1])
      buf[i] = lp[ch][1] * p
    }
    verbSend[i] += (L[i] + R[i]) * 0.25
  }
}

// --- sub bass (sine, follows chord roots)
for (let i = Math.floor(T0 * SR); i < LEN; i++) {
  const t = i / SR
  if (t < T0) continue
  const b = barAt(t)
  const f = mtof(ROOTS[((b % 4) + 4) % 4] - 12 + 12)
  const rel = (t - T0) % BAR
  const env = Math.min(1, rel / 0.05) * (0.7 + 0.3 * Math.exp(-rel * 1.5))
  const fadeOut = t > DRUMS_OUT ? Math.max(0, 1 - (t - DRUMS_OUT) / 0.4) : 1
  const fadeIn = t < DRUMS_IN ? 0 : 1
  add(i, Math.sin(2 * Math.PI * f * t) * env * 0.03 * pump(t) * fadeIn * fadeOut)
}

// --- drums
function kick(t0, gain = 1) {
  let ph = 0
  for (let i = Math.floor(t0 * SR); i < Math.floor((t0 + 0.5) * SR) && i < LEN; i++) {
    const t = i / SR - t0
    const f = 48 + 110 * Math.exp(-t * 28)
    ph += f / SR
    add(i, Math.sin(2 * Math.PI * ph) * Math.exp(-t * 9) * 0.22 * gain + (t < 0.004 ? noise() * 0.04 * gain : 0))
  }
}
function hat(t0, gain = 1, pan = 0.25) {
  let prev = 0
  for (let i = Math.floor(t0 * SR); i < Math.floor((t0 + 0.08) * SR) && i < LEN; i++) {
    const t = i / SR - t0
    const n = noise()
    const hp = n - prev
    prev = n
    add(i, hp * Math.exp(-t * 60) * 0.035 * gain, pan)
  }
}
for (let t = DRUMS_IN; t < DRUMS_OUT; t += BEAT) {
  const beatIdx = Math.round((t - T0) / BEAT) % 4
  if (beatIdx === 0 || beatIdx === 2) kick(t)
  if (t > DRUMS_IN + BAR - 0.01) {
    hat(t + BEAT / 2, 1, 0.3)
    if (t > cue("More") - BAR / 2) hat(t + BEAT * 0.75, 0.55, -0.3) // lift for the payoff line
  }
}

// --- plucked arpeggio (8ths), into the reverb
{
  const pattern = [0, 2, 1, 3, 2, 4, 3, 1]
  for (let t = DRUMS_IN, k = 0; t < DRUMS_OUT + BAR; t += BEAT / 2, k++) {
    const chord = CHORDS[((barAt(t + 0.01) % 4) + 4) % 4]
    const m = chord[pattern[k % 8]] + 12
    const f = mtof(m)
    const pan = k % 2 ? 0.35 : -0.35
    const gain = t > DRUMS_OUT ? 0 : 1
    for (let i = Math.floor(t * SR); i < Math.floor((t + 0.6) * SR) && i < LEN; i++) {
      const tt = i / SR - t
      const v = (Math.sin(2 * Math.PI * f * tt) + 0.25 * Math.sin(4 * Math.PI * f * tt)) * Math.exp(-tt * 9) * Math.min(1, tt / 0.003)
      add(i, v * 0.05 * gain, pan)
      verbSend[i] += v * 0.05 * gain
    }
  }
}

// --- sound design: whooshes (band-passed noise sweeps) and soft impacts
function whoosh(tEnd, dur = 0.7, gain = 1) {
  let low = 0
  let band = 0
  const t0 = tEnd - dur
  for (let i = Math.floor(t0 * SR); i < Math.floor((tEnd + 0.25) * SR) && i < LEN; i++) {
    const t = i / SR - t0
    const x = Math.min(1, t / dur)
    const fc = 300 + 5000 * x * x
    const f = 2 * Math.sin((Math.PI * fc) / SR)
    const q = 0.5
    const n = noise()
    low += f * band
    const high = n - low - q * band
    band += f * high
    const env = t < dur ? x ** 2.2 : Math.exp(-(t - dur) * 18)
    add(i, band * env * 0.11 * gain, Math.sin(t * 6) * 0.4)
    verbSend[i] += band * env * 0.05 * gain
  }
}
function impact(t0, gain = 1) {
  kick(t0, 0.9 * gain)
  for (let i = Math.floor(t0 * SR); i < Math.floor((t0 + 2.5) * SR) && i < LEN; i++) {
    const t = i / SR - t0
    const v = Math.sin(2 * Math.PI * 36 * t) * Math.exp(-t * 3) * 0.05 * gain
    add(i, v)
  }
  // shimmer: high chord tones into the reverb
  for (const m of [77, 81, 84, 88]) {
    const f = mtof(m)
    for (let i = Math.floor(t0 * SR); i < Math.floor((t0 + 2) * SR) && i < LEN; i++) {
      const t = i / SR - t0
      verbSend[i] += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 2.5) * 0.02 * gain
    }
  }
}
whoosh(DRUMS_IN, 0.9, 0.8)
impact(DRUMS_IN, 0.6)
whoosh(cue("No") - 0.05, 0.5, 0.6)
whoosh(cue("More") - 0.05, 0.5, 0.6)
whoosh(LOGO_HIT, 1.2, 0.9)
impact(LOGO_HIT, 1)

// --- Schroeder reverb on the send
{
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({ d: Math.round((d * SR) / 44100), buf: null, i: 0, lp: 0 }))
  combs.forEach((c) => (c.buf = new Float32Array(c.d)))
  const aps = [225, 556, 441].map((d) => ({ d: Math.round((d * SR) / 44100), buf: null, i: 0 }))
  aps.forEach((a) => (a.buf = new Float32Array(a.d)))
  for (let n = 0; n < LEN; n++) {
    const x = verbSend[n]
    let yl = 0
    let yr = 0
    combs.forEach((c, k) => {
      const out = c.buf[c.i]
      c.lp = out * 0.7 + c.lp * 0.3
      c.buf[c.i] = x + c.lp * 0.84
      c.i = (c.i + 1) % c.d
      if (k % 2) yl += out
      else yr += out
    })
    let y = (yl + yr) * 0.5
    for (const a of aps) {
      const b = a.buf[a.i]
      const v = y + b * 0.5
      a.buf[a.i] = v
      y = b - v * 0.5
      a.i = (a.i + 1) % a.d
    }
    L[n] += (y * 0.6 + yl * 0.15) * 0.35
    R[n] += (y * 0.6 + yr * 0.15) * 0.35
  }
}

// --- master: 40 Hz high-pass, soft clip, normalize to -1 dBFS peak
{
  const a = Math.exp((-2 * Math.PI * 40) / SR)
  for (const buf of [L, R]) {
    let px = 0
    let py = 0
    for (let i = 0; i < LEN; i++) {
      const y = a * (py + buf[i] - px)
      px = buf[i]
      py = y
      buf[i] = y
    }
  }
}
let peak = 0
for (let i = 0; i < LEN; i++) {
  L[i] = Math.tanh(L[i] * 1.2)
  R[i] = Math.tanh(R[i] * 1.2)
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
}
const g = 0.89 / peak
const out = Buffer.alloc(44 + LEN * 4)
out.write("RIFF", 0)
out.writeUInt32LE(36 + LEN * 4, 4)
out.write("WAVEfmt ", 8)
out.writeUInt32LE(16, 16)
out.writeUInt16LE(1, 20)
out.writeUInt16LE(2, 22)
out.writeUInt32LE(SR, 24)
out.writeUInt32LE(SR * 4, 28)
out.writeUInt16LE(4, 32)
out.writeUInt16LE(16, 34)
out.write("data", 36)
out.writeUInt32LE(LEN * 4, 40)
for (let i = 0; i < LEN; i++) {
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4)
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4)
}
mkdirSync(`${root}out`, { recursive: true })
writeFileSync(`${root}out/music.wav`, out)
console.log(`music.wav: ${(LEN / SR).toFixed(2)} s`)
