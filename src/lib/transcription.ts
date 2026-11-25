import "server-only"
import type { Word } from "./captions/types"
import { refundCredit, spendCredit } from "./credits"
import { createProject } from "./projects"

export type Transcript = { text: string; words: Word[]; source: "words" | "vtt" }
export type TranscribeFailure = { error: string; status: number }
export type Transcriber = (audio: ArrayBuffer) => Promise<Transcript | TranscribeFailure>

export type FileMeta = { fileName: string; fileSize: number; duration: number }

export type TranscribeOutcome =
  | { ok: true; projectId: string; transcript: Transcript; credits: number }
  | { ok: false; error: string; status: number; code?: string; credits?: number }

/**
 * Spends 1 credit, transcribes, and saves the transcript as a new project, all in one request.
 * Any failure after the credit is taken (transcription or saving) refunds it and leaves no project behind.
 */
export async function transcribeToProject(userId: string, audio: ArrayBuffer, meta: FileMeta, transcribe: Transcriber): Promise<TranscribeOutcome> {
  const note = meta.fileName.slice(0, 120) || "video"
  const credits = await spendCredit(userId, note)
  if (credits === null) return { ok: false, error: "You're out of credits.", status: 402, code: "no_credits" }

  let res: Transcript | TranscribeFailure
  try {
    res = await transcribe(audio)
  } catch {
    res = { error: "Transcription failed. Try again in a moment.", status: 502 }
  }
  if ("error" in res) {
    const refunded = await refundCredit(userId, note)
    return { ok: false, error: res.error, status: res.status, credits: refunded }
  }

  try {
    const projectId = await createProject(userId, { ...meta, words: res.words, timingSource: res.source })
    return { ok: true, projectId, transcript: res, credits }
  } catch (e) {
    console.error("[transcribe] couldn't save the project", e)
    const refunded = await refundCredit(userId, note)
    return { ok: false, error: "Couldn't save your captions. Your credit was refunded.", status: 500, credits: refunded }
  }
}
