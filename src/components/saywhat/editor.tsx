"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ChevronRightIcon, Redo2Icon, Undo2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ExportMenu } from "./export-menu"
import { Preview } from "./preview"
import { StylePanel } from "./style-panel"
import { TranscriptPanel } from "./transcript-panel"
import { useEditor } from "@/store/editor"
import { usePlayer } from "@/store/player"

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      // inside a text field, keep the input's native undo
      if (isTyping(e.target)) return
      const { undo, redo } = useEditor.getState()
      const { toggle, seek, video } = usePlayer.getState()
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
      } else if (e.key === " ") {
        e.preventDefault()
        toggle()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault()
        const step = (e.shiftKey ? 5 : 1) * (e.key === "ArrowLeft" ? -1 : 1)
        seek((video?.currentTime ?? 0) + step)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}

function IconAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" onClick={onClick} disabled={disabled} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** The editing workspace. Fills its container; the page around it provides the app shell. */
export function Editor({ title, status }: { title?: React.ReactNode; status?: React.ReactNode }) {
  useShortcuts()
  const fileName = useEditor((s) => s.file?.name ?? "")
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const { undo, redo } = useEditor.getState()

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
          <Link
            href="/app"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring hidden shrink-0 rounded-sm transition-colors outline-none focus-visible:ring-2 sm:inline"
          >
            Videos
          </Link>
          <ChevronRightIcon className="text-muted-foreground hidden size-3.5 shrink-0 sm:block" aria-hidden />
          {title ?? <span className="truncate">{fileName}</span>}
          {status}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <IconAction label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2Icon />
          </IconAction>
          <IconAction label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
            <Redo2Icon />
          </IconAction>
          <ExportMenu />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)_300px] lg:grid-rows-1">
        <aside className="order-2 min-h-0 border-t lg:order-1 lg:border-t-0 lg:border-r">
          <TranscriptPanel />
        </aside>
        <section className="order-1 min-h-0 lg:order-2">
          <Preview />
        </section>
        <aside className="order-3 hidden min-h-0 border-l lg:block">
          <StylePanel />
        </aside>
      </main>
    </div>
  )
}
