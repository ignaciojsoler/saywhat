"use client"

import { useEffect, useState } from "react"

export function HeaderScroll({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return (
    <header
      className={
        "sticky top-0 z-40 transition-all duration-200 " +
        (scrolled
          ? "border-b border-white/[0.08] bg-[#0a0a0a]/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent")
      }
    >
      {children}
    </header>
  )
}
