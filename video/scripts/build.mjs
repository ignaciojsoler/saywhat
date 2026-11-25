// Render the promo and write the web-ready files used by the landing page:
//   ../public/promo.mp4         H.264 + AAC, 1080x1920, 30 fps, faststart
//   ../public/promo-poster.jpg  frame 0 (matches the first video frame, no flash on play)
//
// Usage: node scripts/build.mjs   (run scripts/tts.mjs, transcribe.mjs, make-transcript.mjs first
// if the voiceover changed)
import { execFileSync } from "node:child_process"
import { mkdirSync, statSync } from "node:fs"

const root = new URL("..", import.meta.url).pathname
const pub = `${root}../public`
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" })
mkdirSync(`${root}out`, { recursive: true })

// 1. High-quality silent master from Remotion.
run("npx", ["remotion", "render", "src/index.ts", "Promo", "out/promo-raw.mp4", "--muted", "--crf=12"])

// 2. Web encode + voiceover. apad/-shortest make the audio track exactly as long as the video.
run("ffmpeg", [
  "-y", "-loglevel", "error",
  "-i", "out/promo-raw.mp4",
  "-i", "voiceover.wav",
  "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "96k", "-ar", "48000", "-ac", "1", "-af", "apad",
  "-shortest", "-movflags", "+faststart",
  `${pub}/promo.mp4`,
])

// 3. Poster = first frame.
run("npx", ["remotion", "still", "src/index.ts", "Promo", "out/poster.png", "--frame=0"])
run("ffmpeg", ["-y", "-loglevel", "error", "-i", "out/poster.png", "-q:v", "4", `${pub}/promo-poster.jpg`])

for (const f of ["promo.mp4", "promo-poster.jpg"]) {
  console.log(`${f}: ${(statSync(`${pub}/${f}`).size / 1024).toFixed(0)} KB`)
}
