"use client"

import { useRef, useState } from "react"
import type { ReactNode } from "react"

export function CtaSpotlight({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [active, setActive] = useState(false)
  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-lg border border-dashed border-white/25 p-4 transition-colors hover:border-[var(--caption)] hover:bg-white/[0.03] sm:p-5"
      onPointerMove={(e) => {
        if (window.matchMedia("(pointer: coarse)").matches) return
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
        setActive(true)
      }}
      onPointerLeave={() => setActive(false)}
      style={
        {
          "--sx": `${pos.x}%`,
          "--sy": `${pos.y}%`,
        } as React.CSSProperties
      }
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background: `radial-gradient(240px circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.06), transparent 60%)`,
          }}
        />
      )}
      {children}
    </div>
  )
}
