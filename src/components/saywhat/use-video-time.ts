"use client"

import { useEffect, useState, type RefObject } from "react"

/**
 * Current time of a <video>, refreshed every animation frame while it plays
 * (timeupdate alone fires ~4x/s, too coarse for word-by-word captions).
 */
export function useVideoTime(ref: RefObject<HTMLVideoElement | null>) {
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    let id = 0
    const tick = () => {
      setT(v.currentTime)
      id = requestAnimationFrame(tick)
    }
    const onPlay = () => {
      setPlaying(true)
      cancelAnimationFrame(id)
      id = requestAnimationFrame(tick)
    }
    const onPause = () => {
      setPlaying(false)
      cancelAnimationFrame(id)
      setT(v.currentTime)
    }
    const onSeek = () => setT(v.currentTime)
    v.addEventListener("playing", onPlay)
    v.addEventListener("pause", onPause)
    v.addEventListener("seeked", onSeek)
    if (!v.paused) onPlay()
    return () => {
      cancelAnimationFrame(id)
      v.removeEventListener("playing", onPlay)
      v.removeEventListener("pause", onPause)
      v.removeEventListener("seeked", onSeek)
    }
  }, [ref])

  return { t, playing }
}

/** Start a muted inline video (React doesn't always reflect `muted` before autoplay kicks in). */
export function playMuted(v: HTMLVideoElement) {
  v.muted = true
  return v.play().catch(() => {})
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
