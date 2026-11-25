"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { MAX_SECONDS } from "@/lib/pipeline"
import { useRef, useState } from "react"

export function CtaCard() {
  const ref = useRef<HTMLAnchorElement>(null)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [active, setActive] = useState(false)
  return (
    <Link
      ref={ref}
      href="/signup"
      className="group focus-visible:ring-ring relative flex items-center gap-4 overflow-hidden rounded-lg border border-dashed border-white/25 p-4 transition-colors outline-none hover:border-[var(--caption)] hover:bg-white/[0.03] focus-visible:ring-2 sm:p-5"
      onPointerMove={(e) => {
        if (window.matchMedia("(pointer: coarse)").matches) return
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
        setActive(true)
      }}
      onPointerLeave={() => setActive(false)}
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(240px circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.06), transparent 60%)` }}
        />
      )}
      <span aria-hidden className="grid h-14 w-10 shrink-0 place-items-center rounded-[5px] border border-white/20 font-mono text-xs text-white/75">
        9:16
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-lg font-semibold tracking-tight">Drop a video</span>
        <span className="text-muted-foreground text-sm">
          MP4, MOV or WebM · up to {MAX_SECONDS / 60} min
        </span>
      </span>
      <span className="bg-primary text-primary-foreground inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3.5 text-sm font-semibold">
        <span className="hidden sm:inline">Start free</span>
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
