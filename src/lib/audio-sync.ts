/**
 * Audio clock drift repair.
 *
 * Some recorders (Loom, screen recorders, cheap capture cards) timestamp audio packets by the wall
 * clock while the microphone's own clock runs slightly fast, so the file holds more audio samples
 * than its timeline has room for (e.g. 111.9 s of samples stamped over 109.9 s). Players that honor
 * timestamps stay in sync, but Chromium plays the samples back to back: the sound slowly falls
 * behind the picture, and anything timed from the decoded audio (our Whisper timings) drifts too.
 *
 * The fix is to squeeze the decoded audio back onto the file's timeline (a ~1-2% resample), use that
 * for transcription, and play it in sync with the muted <video> in the editor and the export.
 */

/** More samples than the timeline can hold, beyond encoder padding: the audio clock drifted. */
export function driftRatio(audioSeconds: number, mediaSeconds: number): number {
  if (!(audioSeconds > 0 && mediaSeconds > 0)) return 1
  // a shorter soundtrack is legit (audio that ends early); a longer one can't be
  return audioSeconds - mediaSeconds > 0.25 && audioSeconds / mediaSeconds > 1.004 ? audioSeconds / mediaSeconds : 1
}

/** Render `buffer` sped up by `ratio` (so it lasts duration / ratio), optionally downmixed / resampled. */
export async function resample(buffer: AudioBuffer, ratio: number, sampleRate = buffer.sampleRate, channels = buffer.numberOfChannels) {
  const off = new OfflineAudioContext(channels, Math.max(1, Math.ceil((buffer.duration / ratio) * sampleRate)), sampleRate)
  const src = off.createBufferSource()
  src.buffer = buffer
  src.playbackRate.value = ratio
  src.connect(off.destination)
  src.start()
  return off.startRendering()
}

/** Decode a file's soundtrack (no realtime AudioContext needed). */
export async function decodeAudio(file: Blob): Promise<AudioBuffer> {
  return new OfflineAudioContext(1, 1, 44100).decodeAudioData(await file.arrayBuffer())
}

/** Duration of the file's timeline, from its metadata (0 if unreadable). */
export function mediaDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement("video")
    const done = (d: number) => {
      URL.revokeObjectURL(url)
      v.removeAttribute("src")
      resolve(Number.isFinite(d) ? d : 0)
    }
    v.preload = "metadata"
    v.onloadedmetadata = () => done(v.duration)
    v.onerror = () => done(0)
    v.src = url
  })
}

/** The file's soundtrack refit to its timeline, or null when it isn't drifting (play it as is). */
export async function timelineAudio(file: Blob): Promise<AudioBuffer | null> {
  const [decoded, duration] = await Promise.all([decodeAudio(file), mediaDuration(file)])
  const ratio = driftRatio(decoded.duration, duration)
  return ratio === 1 ? null : resample(decoded, ratio)
}

/**
 * Play `buffer` in place of the video's own (drifting) sound, following its play / pause / seek / rate.
 * Mutes the element while attached. Returns a function that detaches and restores the element.
 */
export function syncAudio(video: HTMLVideoElement, buffer: AudioBuffer, ctx: AudioContext, out: AudioNode = ctx.destination) {
  const wasMuted = video.muted
  video.muted = true
  let src: AudioBufferSourceNode | null = null
  let from = 0
  let at = 0

  const stop = () => {
    if (!src) return
    src.onended = null
    try {
      src.stop()
    } catch {}
    src.disconnect()
    src = null
  }
  const start = () => {
    stop()
    if (video.paused || video.ended || video.currentTime >= buffer.duration) return
    void ctx.resume()
    src = ctx.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = video.playbackRate
    src.connect(out)
    from = video.currentTime
    at = ctx.currentTime
    src.start(0, from)
  }
  // re-cue if the element stalls or skips and the two drift apart
  const check = () => {
    if (!src || video.paused) return
    const expected = from + (ctx.currentTime - at) * video.playbackRate
    if (Math.abs(expected - video.currentTime) > 0.08) start()
  }

  const on: [string, () => void][] = [
    ["playing", start],
    ["seeked", start],
    ["ratechange", start],
    ["pause", stop],
    ["waiting", stop],
    ["seeking", stop],
    ["ended", stop],
    ["timeupdate", check],
  ]
  on.forEach(([e, f]) => video.addEventListener(e, f))
  if (!video.paused) start()

  return () => {
    on.forEach(([e, f]) => video.removeEventListener(e, f))
    stop()
    video.muted = wasMuted
  }
}
