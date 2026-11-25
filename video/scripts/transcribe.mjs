// Transcribe voiceover.wav with Whisper on Cloudflare Workers AI (same model as the app) and
// save the raw word timings to out/whisper.json. Credentials come from ../.env.local
// (CF_ACCOUNT_ID, CF_API_TOKEN) and are never printed.
//
// Usage: node scripts/transcribe.mjs
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"

const root = new URL("..", import.meta.url).pathname
const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)
const { CF_ACCOUNT_ID, CF_API_TOKEN } = env
if (!CF_ACCOUNT_ID || !CF_API_TOKEN) throw new Error("Missing CF_ACCOUNT_ID / CF_API_TOKEN in .env.local")

mkdirSync(`${root}out`, { recursive: true })
const wav16 = `${root}out/voiceover-16k.wav`
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `${root}voiceover.wav`, "-ac", "1", "-ar", "16000", wav16])

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/openai/whisper`, {
  method: "POST",
  headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/octet-stream" },
  body: readFileSync(wav16),
})
const json = await res.json()
if (!res.ok || !json.result) throw new Error(`Whisper failed (${res.status}): ${JSON.stringify(json.errors ?? json)}`)
writeFileSync(`${root}out/whisper.json`, JSON.stringify(json.result, null, 2))
console.log(json.result.text)
console.log(`${json.result.words?.length ?? 0} words`)
