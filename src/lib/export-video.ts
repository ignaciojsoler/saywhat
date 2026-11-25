import { drawCaptions, fontsFor, type DrawOptions } from "./captions/canvas"
import type { Aspect, CaptionStyle, Line, Word } from "./captions/types"

const ASPECTS: Record<Exclude<Aspect, "original">, number> = { "9:16": 9 / 16, "1:1": 1, "16:9": 16 / 9 }

export const aspectRatio = (aspect: Aspect, original: number) => (aspect === "original" ? original : ASPECTS[aspect])

/** Output size: 1080 px on the short side (rounded to even, as codecs require). */
function outputSize(ratio: number) {
  const even = (n: number) => Math.round(n / 2) * 2
  return ratio < 1 ? { W: 1080, H: even(1080 / ratio) } : { W: even(1080 * ratio), H: 1080 }
}

function pickMime() {
  const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""
}

type Options = {
  url: string
  words: Word[]
  lines: Line[]
  style: CaptionStyle
  aspect: Aspect
  onProgress: (p: number) => void
  signal: AbortSignal
}

/**
 * Render the video with burned-in captions: draw each frame to a canvas (cropped to the
 * chosen aspect) and record it with the original audio. Takes as long as the video.
 */
export async function exportVideo({ url, words, lines, style, aspect, onProgress, signal }: Options) {
  const video = document.createElement("video")
  video.src = url
  video.playsInline = true
  video.preload = "auto"
  await new Promise<void>((ok, fail) => {
    video.onloadedmetadata = () => ok()
    video.onerror = () => fail(new Error("No se pudo abrir el video"))
  })

  const srcRatio = video.videoWidth / video.videoHeight
  const { W, H } = outputSize(aspectRatio(aspect, srcRatio))
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")!

  // make sure the caption font is ready before the first frame
  await Promise.all(fontsFor(style).map((f) => document.fonts.load(f))).catch(() => {})
  // glass panels frost the frame underneath, which is already on this canvas when captions draw
  const opts: DrawOptions = style.background === "glass" ? { backdrop: (c, w, h) => c.drawImage(canvas, 0, 0, w, h) } : {}

  // video audio → recorder, without playing through the speakers
  const actx = new AudioContext()
  const dest = actx.createMediaStreamDestination()
  actx.createMediaElementSource(video).connect(dest)

  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()])
  const mimeType = pickMime()
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)

  // "cover" crop: the video fills the chosen frame
  const scale = Math.max(W / video.videoWidth, H / video.videoHeight)
  const dw = video.videoWidth * scale
  const dh = video.videoHeight * scale
  const dx = (W - dw) / 2
  const dy = (H - dh) / 2

  const draw = () => {
    ctx.drawImage(video, dx, dy, dw, dh)
    drawCaptions(ctx, W, H, words, lines, video.currentTime, style, opts)
    onProgress(video.duration ? video.currentTime / video.duration : 0)
  }
  const loop = () => {
    if (video.paused || video.ended) return
    draw()
    if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(loop)
    else requestAnimationFrame(loop)
  }

  const done = new Promise<Blob>((ok, fail) => {
    recorder.onstop = () => (signal.aborted ? fail(new DOMException("Cancelado", "AbortError")) : ok(new Blob(chunks, { type: mimeType || "video/webm" })))
    video.onended = () => {
      draw()
      recorder.stop()
    }
    signal.addEventListener("abort", () => {
      video.pause()
      if (recorder.state !== "inactive") recorder.stop()
    })
  })

  try {
    await actx.resume()
    video.currentTime = 0
    recorder.start(250)
    await video.play()
    loop()
    const blob = await done
    return { blob, ext: mimeType.includes("mp4") ? "mp4" : "webm" }
  } finally {
    stream.getTracks().forEach((t) => t.stop())
    void actx.close()
    video.removeAttribute("src")
    video.load()
  }
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}
