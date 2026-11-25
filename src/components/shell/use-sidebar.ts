"use client"

import { useCallback, useSyncExternalStore } from "react"

/** Sidebar collapsed/expanded preference, per user, in localStorage (synced across tabs). */

const EVENT = "saywhat:sidebar"
const keyFor = (userId: string) => `saywhat.sidebar.${userId}`

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

function read(userId: string): boolean {
  try {
    return localStorage.getItem(keyFor(userId)) === "collapsed"
  } catch {
    return false
  }
}

export function useSidebarPref(userId: string): [collapsed: boolean, setCollapsed: (v: boolean) => void] {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => false,
  )
  const set = useCallback(
    (v: boolean) => {
      try {
        localStorage.setItem(keyFor(userId), v ? "collapsed" : "expanded")
      } catch {}
      window.dispatchEvent(new Event(EVENT))
    },
    [userId],
  )
  return [collapsed, set]
}
