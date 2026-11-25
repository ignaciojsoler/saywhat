"use client"

import { create } from "zustand"

/**
 * Playback state, kept apart from the editor: time changes ~60x per second and
 * shouldn't re-render panels that only depend on words or style.
 */
type Player = {
  video: HTMLVideoElement | null
  time: number
  playing: boolean
  /** source video width / height */
  ratio: number
  setVideo: (v: HTMLVideoElement | null) => void
  setTime: (t: number) => void
  setPlaying: (p: boolean) => void
  setRatio: (r: number) => void
  toggle: () => void
  seek: (t: number) => void
}

export const usePlayer = create<Player>((set, get) => ({
  video: null,
  time: 0,
  playing: false,
  ratio: 16 / 9,
  setVideo: (video) => set({ video }),
  setTime: (time) => set({ time }),
  setPlaying: (playing) => set({ playing }),
  setRatio: (ratio) => set({ ratio }),
  toggle: () => {
    const v = get().video
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  },
  seek: (t) => {
    const v = get().video
    if (!v) return
    v.currentTime = Math.max(0, Math.min(t, v.duration || t))
    set({ time: v.currentTime })
  },
}))
