"use client"

import { create } from "zustand"
import { DEFAULT_STYLE } from "@/lib/captions/presets"
import { sanitizeStyle } from "@/lib/project-schema"
import { groupWords, replaceLineText } from "@/lib/captions/timing"
import type { Aspect, CaptionStyle, Line, Word } from "@/lib/captions/types"

type Snapshot = { words: Word[]; style: CaptionStyle }
export type Phase = "idle" | "extracting" | "transcribing" | "ready" | "error"

type State = {
  /** the saved project being edited (null while uploading) */
  projectId: string | null
  title: string
  phase: Phase
  error: string | null
  file: File | null
  videoUrl: string | null
  duration: number
  words: Word[]
  lines: Line[]
  style: CaptionStyle
  aspect: Aspect
  /** where word timing came from: "vtt" = approximated per sentence */
  timingSource: "words" | "vtt" | null
  past: Snapshot[]
  future: Snapshot[]
}

export type Hydrate = {
  projectId: string
  title: string
  file: File
  words: Word[]
  timingSource: "words" | "vtt"
  /** null: the project has no saved style yet, use the last one this browser used */
  style: CaptionStyle | null
  aspect: Aspect
}

type Actions = {
  load: (file: File) => void
  /** open a saved project: transcript and style from the server, the video from this device */
  hydrate: (p: Hydrate) => void
  setProjectId: (id: string) => void
  setTitle: (title: string) => void
  setPhase: (phase: Phase, error?: string) => void
  setDuration: (d: number) => void
  setTranscript: (words: Word[], source: "words" | "vtt") => void
  editLine: (k: number, text: string) => void
  /** record=false for live changes (dragging a slider); recorded on release */
  setStyle: (patch: Partial<CaptionStyle>, record?: boolean) => void
  commitStyle: () => void
  setAspect: (a: Aspect) => void
  undo: () => void
  redo: () => void
  reset: () => void
}

const HISTORY = 100
const STYLE_KEY = "saywhat.style"

function savedStyle(): CaptionStyle {
  if (typeof window === "undefined") return DEFAULT_STYLE
  try {
    const raw = localStorage.getItem(STYLE_KEY)
    return raw ? sanitizeStyle(JSON.parse(raw)) : DEFAULT_STYLE
  } catch {
    return DEFAULT_STYLE
  }
}

const persist = (style: CaptionStyle) => {
  try {
    localStorage.setItem(STYLE_KEY, JSON.stringify(style))
  } catch {}
}

const initial = {
  projectId: null as string | null,
  title: "",
  phase: "idle" as Phase,
  error: null,
  file: null,
  videoUrl: null,
  duration: 0,
  words: [],
  lines: [],
  aspect: "original" as Aspect,
  timingSource: null,
  past: [],
  future: [],
}

export const useEditor = create<State & Actions>((set, get) => {
  /** push the current state onto the undo stack before a change */
  const record = () => {
    const { words, style, past } = get()
    set({ past: [...past.slice(-HISTORY + 1), { words, style }], future: [] })
  }
  // style snapshot taken when a slider drag starts, so the whole drag is one undo step
  let liveBase: CaptionStyle | null = null

  return {
    ...initial,
    style: DEFAULT_STYLE,

    load: (file) => {
      const prev = get().videoUrl
      if (prev) URL.revokeObjectURL(prev)
      set({ ...initial, style: savedStyle(), file, videoUrl: URL.createObjectURL(file), phase: "extracting" })
    },
    hydrate: (p) => {
      const prev = get().videoUrl
      if (prev) URL.revokeObjectURL(prev)
      const style = p.style ? sanitizeStyle(p.style) : savedStyle()
      set({
        ...initial,
        projectId: p.projectId,
        title: p.title,
        file: p.file,
        videoUrl: URL.createObjectURL(p.file),
        words: p.words,
        timingSource: p.timingSource,
        style,
        aspect: p.aspect,
        lines: groupWords(p.words, style.wordsPerLine),
        phase: "ready",
      })
    },
    setProjectId: (projectId) => set({ projectId }),
    setTitle: (title) => set({ title }),
    setPhase: (phase, error) => set({ phase, error: error ?? null }),
    setDuration: (duration) => set({ duration }),
    setTranscript: (words, timingSource) =>
      set({ words, timingSource, lines: groupWords(words, get().style.wordsPerLine), phase: "ready", past: [], future: [] }),

    editLine: (k, text) => {
      const { words, lines, style } = get()
      const line = lines[k]
      if (!line) return
      const current = words.slice(line[0], line[1]).map((w) => w.w).join(" ")
      if (text.trim() === current) return
      record()
      const next = replaceLineText(words, line, text)
      set({ words: next, lines: groupWords(next, style.wordsPerLine) })
    },

    setStyle: (patch, rec = true) => {
      const { style, words } = get()
      if (rec) record()
      else if (!liveBase) liveBase = style
      const next = { ...style, ...patch }
      set({ style: next, lines: patch.wordsPerLine ? groupWords(words, next.wordsPerLine) : get().lines })
      persist(next)
    },
    commitStyle: () => {
      if (!liveBase) return
      const { words, past } = get()
      set({ past: [...past.slice(-HISTORY + 1), { words, style: liveBase }], future: [] })
      liveBase = null
    },

    setAspect: (aspect) => set({ aspect }),

    undo: () => {
      const { past, future, words, style } = get()
      const prev = past.at(-1)
      if (!prev) return
      set({
        past: past.slice(0, -1),
        future: [{ words, style }, ...future],
        words: prev.words,
        style: prev.style,
        lines: groupWords(prev.words, prev.style.wordsPerLine),
      })
      persist(prev.style)
    },
    redo: () => {
      const { past, future, words, style } = get()
      const next = future[0]
      if (!next) return
      set({
        past: [...past, { words, style }],
        future: future.slice(1),
        words: next.words,
        style: next.style,
        lines: groupWords(next.words, next.style.wordsPerLine),
      })
      persist(next.style)
    },

    reset: () => {
      const prev = get().videoUrl
      if (prev) URL.revokeObjectURL(prev)
      set({ ...initial, style: get().style })
    },
  }
})
