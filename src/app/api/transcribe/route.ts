import { z } from "zod"
import { auth } from "@/lib/auth"
import { transcribeToProject, type Transcript } from "@/lib/transcription"

/**
 * POST /api/transcribe — body: WAV 16 kHz mono (generated in the browser) → { text, words, source, projectId, credits }
 * Headers: X-File-Name (URI-encoded), X-File-Size (bytes), X-Duration (seconds) describe the original video.
 * Whisper runs on Cloudflare Workers AI; credentials live in environment variables.
 * Requires a session and costs 1 credit, refunded if transcription fails. On success the transcript is saved
 * as a project (text only: the audio is discarded and the video never leaves the browser).
 */

const MODEL = "@cf/openai/whisper" // MIT
// Vercel caps function request bodies at 4.5 MB: ~2 min of 16 kHz mono WAV
const MAX_BYTES = 4 * 1024 * 1024

const WhisperOut = z.object({
  result: z
    .object({
      text: z.string().optional(),
      words: z
        .array(z.object({ word: z.string(), start: z.number().optional(), end: z.number().optional() }))
        .optional(),
      vtt: z.string().optional(),
    })
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

type Word = { w: string; s: number; e: number }

// "00:01.500" o "00:00:01.500" → segundos
const toSec = (s: string) => s.trim().split(":").reduce((acc, p) => acc * 60 + parseFloat(p.replace(",", ".")), 0)

/** Fallback: without per-word timing, spread each VTT cue evenly across its words. */
function wordsFromVtt(vtt: string): Word[] {
  const out: Word[] = []
  const re = /([\d:.,]+)\s*-->\s*([\d:.,]+)[^\n]*\n([\s\S]*?)(?:\n\n|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(vtt))) {
    const s = toSec(m[1])
    const e = toSec(m[2])
    const toks = m[3].trim().split(/\s+/).filter(Boolean)
    const d = (e - s) / (toks.length || 1)
    toks.forEach((w, i) => out.push({ w, s: s + i * d, e: s + (i + 1) * d }))
  }
  return out
}

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

const fail = (error: string, status: number, code?: string) => Response.json({ error, code }, { status })

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return fail("Sign in to caption videos.", 401, "unauthorized")

  const { CF_ACCOUNT_ID, CF_API_TOKEN } = process.env
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) return fail("Transcription isn't configured on this server (missing Cloudflare credentials)", 500)

  const audio = await request.arrayBuffer()
  if (!audio.byteLength) return fail("The audio is empty", 400)
  if (audio.byteLength > MAX_BYTES) return fail("This video is too long. The limit is 2 minutes.", 413)

  const num = (h: string) => {
    const n = Number(request.headers.get(h))
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const meta = {
    fileName: safeDecode(request.headers.get("x-file-name") ?? "video").slice(0, 255) || "video",
    fileSize: num("x-file-size"),
    duration: num("x-duration"),
  }

  const out = await transcribeToProject(session.user.id, audio, meta, (a) => transcribe(a, CF_ACCOUNT_ID, CF_API_TOKEN))
  if (!out.ok) return Response.json({ error: out.error, code: out.code, credits: out.credits }, { status: out.status })
  return Response.json({ ...out.transcript, projectId: out.projectId, credits: out.credits })
}

async function transcribe(audio: ArrayBuffer, CF_ACCOUNT_ID: string, CF_API_TOKEN: string): Promise<Transcript | { error: string; status: number }> {
  const fail = (error: string, status: number) => ({ error, status })

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODEL}`
  const authHeader = { Authorization: `Bearer ${CF_API_TOKEN}` }

  // The model accepts raw binary; if that's rejected, retry with the JSON form { audio: number[] }
  let res: Response
  try {
    res = await fetch(url, { method: "POST", headers: { ...authHeader, "Content-Type": "application/octet-stream" }, body: audio })
    if (res.status >= 400 && res.status < 500) {
      res = await fetch(url, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ audio: Array.from(new Uint8Array(audio)) }),
      })
    }
  } catch {
    return fail("Couldn't reach the transcription service. Try again in a moment.", 502)
  }

  const parsed = WhisperOut.safeParse(await res.json().catch(() => ({})))
  if (!res.ok || !parsed.success) {
    const msg = parsed.success ? parsed.data.errors?.[0]?.message : undefined
    return fail(msg ?? `Transcription failed (${res.status})`, 502)
  }

  const r = parsed.data.result ?? {}
  let words: Word[] = (r.words ?? [])
    .filter((w) => w.start != null && w.end != null && w.word.trim())
    .map((w) => ({ w: w.word.trim(), s: w.start!, e: w.end! }))
  let source: "words" | "vtt" = "words"
  if (!words.length && r.vtt) {
    words = wordsFromVtt(r.vtt)
    source = "vtt"
  }
  // nothing to caption: don't charge for it
  if (!words.length) return fail("No speech found in this video.", 422)
  return { text: r.text ?? "", words, source }
}
