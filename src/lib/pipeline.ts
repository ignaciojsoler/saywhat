import { extractSpeechAudio, toWav } from "./audio"
import type { Word } from "./captions/types"

export const MAX_SECONDS = 120

type Result = { words: Word[]; source: "words" | "vtt"; credits: number }

/** Thrown when the server refuses because the balance is empty (HTTP 402). */
export class OutOfCreditsError extends Error {
  constructor() {
    super("You're out of credits.")
    this.name = "OutOfCreditsError"
  }
}

/** Video → 16 kHz audio in the browser → Whisper (via /api/transcribe, 1 credit) → timed words. */
export async function transcribeFile(
  file: File,
  hooks: { onTranscribing: () => void; onCredits?: (n: number) => void },
): Promise<Result> {
  let audio: AudioBuffer
  try {
    audio = await extractSpeechAudio(file)
  } catch {
    throw new Error("This file's audio couldn't be read. Try an MP4, MOV or WebM export.")
  }
  if (audio.duration > MAX_SECONDS) {
    throw new Error(`This video is ${Math.round(audio.duration)} s long. The limit is ${MAX_SECONDS / 60} minutes; trim it and try again.`)
  }

  hooks.onTranscribing()
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "audio/wav", "X-File-Name": encodeURIComponent(file.name) },
    body: toWav(audio),
  })
  const data = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string; code?: string }
  if (typeof data.credits === "number") hooks.onCredits?.(data.credits)
  if (res.status === 402 || data.code === "no_credits") throw new OutOfCreditsError()
  if (res.status === 401) throw new Error("Your session expired. Sign in again.")
  if (!res.ok) throw new Error(data.error ?? "Transcription failed. Try again in a moment.")
  if (!data.words?.length) throw new Error("No speech found in this video.")
  return { words: data.words, source: data.source ?? "words", credits: data.credits ?? 0 }
}
