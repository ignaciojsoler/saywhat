"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { MenuIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string }

/**
 * Hamburger menu for the marketing header below `md`, where the inline nav is hidden.
 * The panel is absolutely positioned under the sticky header, so opening it never shifts the page.
 * `account` holds session-aware links (e.g. "Log in" for guests); any link tap closes the menu.
 */
export function MobileMenu({ items, account }: { items: NavItem[]; account?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false)
    }
    // Close if the viewport grows past `md`, where the inline nav takes over.
    const mq = window.matchMedia("(min-width: 768px)")
    const onMq = () => mq.matches && setOpen(false)
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    mq.addEventListener("change", onMq)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
      mq.removeEventListener("change", onMq)
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="focus-visible:ring-ring -mr-2 flex size-11 items-center justify-center rounded-full text-white/80 transition-colors outline-none hover:bg-white/[0.07] hover:text-white focus-visible:ring-2"
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </button>
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false)
        }}
        className={cn(
          "absolute inset-x-0 top-full border-b border-white/[0.08] bg-[#0a0a0a]/95 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md",
          open && "animate-in fade-in slide-in-from-top-1 duration-200",
        )}
      >
        <nav aria-label="Mobile" className="mx-auto flex w-full max-w-6xl flex-col px-3 py-2 sm:px-4">
          {items.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="focus-visible:ring-ring flex h-12 items-center rounded-lg px-3 text-base text-white/75 transition-colors outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2"
            >
              {n.label}
            </Link>
          ))}
          {account}
        </nav>
      </div>
    </div>
  )
}

/** "Log in" row for the mobile menu; shown to guests only. */
export function MobileMenuLogin() {
  return (
    <>
      <div aria-hidden className="mx-3 my-1 h-px bg-white/[0.08] sm:hidden" />
      <Link
        href="/login"
        className="focus-visible:ring-ring flex h-12 items-center rounded-lg px-3 text-base text-white/75 transition-colors outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 sm:hidden"
      >
        Log in
      </Link>
    </>
  )
}
