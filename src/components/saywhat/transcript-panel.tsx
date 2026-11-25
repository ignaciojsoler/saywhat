"use client"

import { memo, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Kbd } from "@/components/ui/kbd"
import { activeLineAt } from "@/lib/captions/timing"
import { clock } from "@/lib/captions/formats"
import { cn } from "@/lib/utils"
import { useEditor } from "@/store/editor"
import { usePlayer } from "@/store/player"

const LineRow = memo(function LineRow({
  k,
  start,
  text,
  active,
}: {
  k: number
  start: number
  text: string
  active: boolean
}) {
  const editLine = useEditor((s) => s.editLine)
  const seek = usePlayer((s) => s.seek)
  const rowRef = useRef<HTMLDivElement>(null)
  const playing = usePlayer((s) => s.playing)

  // follow playback without stealing scroll while the user is editing
  useEffect(() => {
    if (active && playing && !rowRef.current?.contains(document.activeElement)) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [active, playing])

  return (
    <div
      ref={rowRef}
      className={cn(
        "group flex items-start gap-2 rounded-md border-l-2 border-transparent px-2 py-1.5 transition-colors",
        active ? "bg-muted border-primary" : "hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={() => seek(start + 0.01)}
        className="text-muted-foreground hover:text-primary mt-0.5 w-11 shrink-0 text-left font-mono text-[11px] tabular-nums"
        title="Jump here"
      >
        {clock(start)}
      </button>
      <input
        key={text /* remount when undo/redo changes the text */}
        defaultValue={text}
        spellCheck
        className="min-w-0 flex-1 bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus:text-foreground"
        onFocus={() => seek(start + 0.01)}
        onBlur={(e) => editLine(k, e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") {
            e.currentTarget.value = text
            e.currentTarget.blur()
          }
        }}
        aria-label={`Line ${k + 1}`}
      />
    </div>
  )
})

export function TranscriptPanel() {
  const words = useEditor((s) => s.words)
  const lines = useEditor((s) => s.lines)
  const timingSource = useEditor((s) => s.timingSource)
  const activeK = usePlayer((s) => activeLineAt(words, lines, s.time))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-medium">Transcript</span>
        <div className="flex gap-1.5">
          {timingSource === "vtt" && <Badge variant="outline" title="This transcript came back with sentence timing only">approx. timing</Badge>}
          <Badge variant="secondary">{words.length} words</Badge>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 p-2">
          {lines.map(([a, b], k) => (
            <LineRow
              key={`${k}-${words[a].s}`}
              k={k}
              start={words[a].s}
              text={words.slice(a, b).map((w) => w.w).join(" ")}
              active={k === activeK}
            />
          ))}
        </div>
      </ScrollArea>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2.5 text-[11px]">
        <span>
          <Kbd>Space</Kbd> play
        </span>
        <span>
          <Kbd>←</Kbd> <Kbd>→</Kbd> seek
        </span>
        <span>
          <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> undo
        </span>
      </div>
    </div>
  )
}
