// Generate the promo voiceover locally with Kokoro TTS (kokoro-js, Apache-2.0 weights).
// The model (~90 MB, q8) is downloaded once from Hugging Face (onnx-community/Kokoro-82M-v1.0-ONNX)
// and cached by transformers.js. No account or API key needed.
//
// Usage: node scripts/tts.mjs  ->  writes voiceover.wav (24 kHz mono, 16-bit PCM)
import { writeFileSync } from "node:fs"
import { KokoroTTS } from "kokoro-js"

const VOICE = "af_heart"
const SPEED = 1.0
const SAMPLE_RATE = 24000

// Lines are spelled for pronunciation ("Say-what", "S R T"); script.md has the clean text.
// `pause` = silence (s) appended after the line.
const LINES = [
  { text: "You get one second to stop the scroll.", pause: 0.3 },
  { text: "Make it count.", pause: 0.45 },
  { text: "Say-what turns any clip into bold, word-by-word captions,", pause: 0.12 },
  { text: "that grab attention, and keep people watching.", pause: 0.45 },
  { text: "No editing skills. No timeline.", pause: 0.2 },
  { text: "Just drop in your video, and you're ready to post in minutes.", pause: 0.45 },
  { text: "More watch time. More views.", pause: 0.5 },
  { text: "Caption your next video with Say-what.", pause: 2.2 },
]
const LEAD_IN = 0.15

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" })

const chunks = [new Float32Array(Math.round(LEAD_IN * SAMPLE_RATE))]
for (const { text, pause } of LINES) {
  const audio = await tts.generate(text, { voice: VOICE, speed: SPEED })
  if (audio.sampling_rate !== SAMPLE_RATE) throw new Error(`unexpected sample rate ${audio.sampling_rate}`)
  chunks.push(trimSilence(audio.audio), new Float32Array(Math.round(pause * SAMPLE_RATE)))
  console.log(`✓ ${text}`)
}

const total = chunks.reduce((n, c) => n + c.length, 0)
const pcm = new Float32Array(total)
let off = 0
for (const c of chunks) {
  pcm.set(c, off)
  off += c.length
}
writeFileSync(new URL("../voiceover.wav", import.meta.url), toWav(pcm, SAMPLE_RATE))
console.log(`voiceover.wav: ${(total / SAMPLE_RATE).toFixed(2)} s`)

/** Trim leading/trailing near-silence so pauses are controlled by LINES. */
function trimSilence(x, thr = 0.01) {
  let a = 0
  let b = x.length - 1
  while (a < b && Math.abs(x[a]) < thr) a++
  while (b > a && Math.abs(x[b]) < thr) b--
  const pad = Math.round(0.03 * SAMPLE_RATE)
  return x.slice(Math.max(0, a - pad), Math.min(x.length, b + pad))
}

function toWav(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2)
  buf.write("RIFF", 0)
  buf.writeUInt32LE(36 + samples.length * 2, 4)
  buf.write("WAVEfmt ", 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write("data", 36)
  buf.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  return buf
}
