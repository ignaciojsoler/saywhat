import { decodeAudio, driftRatio, mediaDuration, resample } from "./audio-sync"

/** Audio helpers. Everything runs in the browser; the video is never uploaded. */

const SR = 16000 // what Whisper expects; also keeps the request small (~32 KB/s)

/**
 * Decode a video/audio file's soundtrack and downmix it to 16 kHz mono, refit to the file's timeline
 * when its audio clock drifted (see audio-sync.ts), so Whisper's timings line up with the picture.
 */
export async function extractSpeechAudio(file: File): Promise<AudioBuffer> {
  const [decoded, duration] = await Promise.all([decodeAudio(file), mediaDuration(file)])
  return resample(decoded, driftRatio(decoded.duration, duration), SR, 1)
}

/** 16-bit PCM WAV from a mono AudioBuffer. */
export function toWav(buffer: AudioBuffer): Blob {
  const data = buffer.getChannelData(0)
  const sr = buffer.sampleRate
  const out = new ArrayBuffer(44 + data.length * 2)
  const v = new DataView(out)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, "RIFF")
  v.setUint32(4, 36 + data.length * 2, true)
  str(8, "WAVE")
  str(12, "fmt ")
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, sr, true)
  v.setUint32(28, sr * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, "data")
  v.setUint32(40, data.length * 2, true)
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([out], { type: "audio/wav" })
}
