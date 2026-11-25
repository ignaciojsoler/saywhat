import { z } from "zod"
import { FONTS, type Aspect, type CaptionStyle, type Word } from "./captions/types"
import { DEFAULT_STYLE, migrateStyle } from "./captions/presets"

/** Shapes shared by the client (autosave) and the server (validation). Text data only. */

export const ASPECTS = ["original", "9:16", "1:1", "16:9"] as const satisfies readonly Aspect[]

const MAX_WORDS = 5000

export const WordSchema = z.object({
  w: z.string().max(200),
  s: z.number().finite().min(0),
  e: z.number().finite().min(0),
}) satisfies z.ZodType<Word>

export const WordsSchema = z.array(WordSchema).max(MAX_WORDS)

/**
 * Caption style as an opaque bag of primitives. The style model evolves with the editor, so the server
 * only bounds its size and shape; the client merges it over the current defaults (see sanitizeStyle).
 */
export const StyleSchema = z
  .record(z.string().max(40), z.union([z.string().max(64), z.number().finite(), z.boolean()]))
  .refine((o) => Object.keys(o).length <= 60, "Too many style fields")

export const TitleSchema = z.string().trim().min(1).max(120)

/** Fields the editor autosaves. Every field is optional; only the ones present are written. */
export const ProjectPatchSchema = z
  .object({
    title: TitleSchema,
    words: WordsSchema,
    style: StyleSchema,
    aspect: z.enum(ASPECTS),
    /** set when the user exports a video or subtitles */
    exported: z.literal(true),
  })
  .partial()
  .strict()

export type ProjectPatch = z.infer<typeof ProjectPatchSchema>

/** What the dashboard needs: no transcript. Dates are epoch ms so they cross the server/client boundary as plain numbers. */
export type ProjectSummary = {
  id: string
  title: string
  fileName: string
  fileSize: number
  duration: number
  aspect: Aspect
  wordCount: number
  createdAt: number
  updatedAt: number
  lastExportedAt: number | null
}

/** Everything the editor needs to reopen a project. */
export type ProjectData = ProjectSummary & {
  words: Word[]
  style: CaptionStyle | null
  timingSource: "words" | "vtt"
}

/** "clip.final.mp4" → "clip.final" */
export const titleFromFileName = (name: string) => name.replace(/\.[^./\\]+$/, "").trim().slice(0, 120) || "Untitled video"

/** A saved style merged over today's defaults: unknown keys, wrong types and unknown fonts are dropped. */
export function sanitizeStyle(raw: unknown): CaptionStyle {
  const saved = migrateStyle(raw) // translate styles from older versions first
  const out: Record<string, unknown> = { ...DEFAULT_STYLE }
  if (saved && typeof saved === "object") {
    for (const [k, v] of Object.entries(saved)) {
      if (k in DEFAULT_STYLE && typeof v === typeof (DEFAULT_STYLE as Record<string, unknown>)[k]) out[k] = v
    }
  }
  if (!(String(out.font) in FONTS)) out.font = DEFAULT_STYLE.font
  return out as CaptionStyle
}

/** The fields the editor autosaves: the server payload on load, the store snapshot while editing. */
export type EditorSnapshot = {
  words: Word[]
  style: CaptionStyle | null
  aspect: Aspect
  title: string
}

/**
 * Brings a snapshot to the shape the editor stores: styles merged over today's defaults.
 * Applying it to both sides makes a raw server payload compare equal to the client state.
 */
export function normalizeSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return { ...snapshot, style: snapshot.style ? sanitizeStyle(snapshot.style) : null }
}

const sameStyle = (a: CaptionStyle | null, b: CaptionStyle | null): boolean => {
  if (a === b) return true
  if (!a || !b) return false
  const keys = Object.keys(a) as (keyof CaptionStyle)[]
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
}

/** Fields that differ between the saved baseline and the current state, or null when nothing changed. */
export function diffSnapshot(saved: EditorSnapshot, current: EditorSnapshot): ProjectPatch | null {
  const base = normalizeSnapshot(saved)
  const next = normalizeSnapshot(current)
  const patch: ProjectPatch = {}
  if (next.words !== base.words) patch.words = next.words
  if (next.style && !sameStyle(base.style, next.style)) patch.style = next.style
  if (next.aspect !== base.aspect) patch.aspect = next.aspect
  const title = next.title.trim()
  if (title && title !== base.title) patch.title = title
  return Object.keys(patch).length ? patch : null
}
