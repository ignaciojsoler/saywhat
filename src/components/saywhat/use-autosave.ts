"use client"

import { useEffect, useState } from "react"
import type { Aspect, CaptionStyle, Word } from "@/lib/captions/types"
import type { ProjectPatch } from "@/lib/project-schema"
import { useEditor } from "@/store/editor"

export type SaveStatus = "saved" | "saving" | "error"

type Saved = { words: Word[]; style: CaptionStyle | null; aspect: Aspect; title: string }

/**
 * Last version of each project this tab saved. Next keeps visited pages mounted, so a page
 * revisited with back/forward may hold older server props than what we already saved.
 */
export const savedProjects = new Map<string, Saved & { updatedAt: number }>()

const DEBOUNCE_MS = 800
const RETRY_MS = 5000

/**
 * Debounced autosave of the open project (words, style, aspect, title) to PATCH /api/projects/:id.
 * `initial` is what the server has; anything in the store that differs from it gets saved.
 */
export function useAutosave(projectId: string, initial: Saved): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("saved")

  useEffect(() => {
    let saved: Saved = { ...initial }
    let timer: ReturnType<typeof setTimeout> | undefined
    let inflight = false
    let disposed = false

    const diff = (): ProjectPatch | null => {
      const s = useEditor.getState()
      if (s.projectId !== projectId || s.phase !== "ready") return null
      const p: ProjectPatch = {}
      if (s.words !== saved.words) p.words = s.words
      if (s.style !== saved.style) p.style = s.style
      if (s.aspect !== saved.aspect) p.aspect = s.aspect
      const title = s.title.trim()
      if (title && title !== saved.title) p.title = title
      return Object.keys(p).length ? p : null
    }

    const flush = async (keepalive = false) => {
      clearTimeout(timer)
      if (inflight && !keepalive) return
      const patch = diff()
      if (!patch) {
        if (!disposed) setStatus("saved")
        return
      }
      inflight = true
      const s = useEditor.getState()
      const sent: Saved = { words: s.words, style: s.style, aspect: s.aspect, title: patch.title ?? saved.title }
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
          keepalive,
        })
        if (!res.ok) throw new Error(String(res.status))
        const { updatedAt } = (await res.json().catch(() => ({}))) as { updatedAt?: number }
        saved = sent
        savedProjects.set(projectId, { ...sent, updatedAt: updatedAt ?? Date.now() })
        inflight = false
        if (disposed) return
        // more edits arrived while saving
        if (diff()) schedule()
        else setStatus("saved")
      } catch {
        inflight = false
        if (disposed) return
        setStatus("error")
        timer = setTimeout(() => void flush(), RETRY_MS)
      }
    }

    const schedule = () => {
      setStatus("saving")
      clearTimeout(timer)
      timer = setTimeout(() => void flush(), DEBOUNCE_MS)
    }

    const unsub = useEditor.subscribe((s, prev) => {
      if (s.projectId !== projectId) return
      if (s.words === prev.words && s.style === prev.style && s.aspect === prev.aspect && s.title === prev.title) return
      if (diff()) schedule()
    })
    // e.g. a project without a saved style picks up this browser's last one: save it right away
    if (diff()) schedule()

    const onHide = () => {
      if (document.visibilityState === "hidden") void flush(true)
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", onHide)

    return () => {
      disposed = true
      unsub()
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", onHide)
      // leaving the editor: send what's pending without waiting for the debounce
      void flush(true)
    }
    // `initial` is the server snapshot when the project was opened; later changes come from this hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return status
}
