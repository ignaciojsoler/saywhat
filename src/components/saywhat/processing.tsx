"use client"

import { CheckIcon } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Phase } from "@/store/editor"

const STEPS: { phase: Phase; label: string }[] = [
  { phase: "extracting", label: "Reading your video" },
  { phase: "transcribing", label: "Writing your captions" },
  { phase: "ready", label: "Opening the editor" },
]

export function Processing({ phase, fileName, videoUrl }: { phase: Phase; fileName: string; videoUrl: string | null }) {
  const current = STEPS.findIndex((s) => s.phase === phase)
  return (
    <div className="flex w-full flex-col items-center justify-center gap-10 py-10 sm:flex-row sm:gap-14">
        {videoUrl && (
          <div className="w-44 shrink-0 overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
            <video src={videoUrl} muted playsInline preload="metadata" className="aspect-[9/16] w-full object-cover opacity-80" />
          </div>
        )}
        <div className="flex w-full max-w-sm flex-col gap-7">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Captioning your video</h1>
            <p className="text-muted-foreground truncate text-sm">{fileName}</p>
            <p className="text-muted-foreground text-xs">Usually under 30 seconds. If it fails, your credit is refunded.</p>
          </div>
          <ol className="flex flex-col gap-5" aria-live="polite">
            {STEPS.map((s, i) => {
              const done = i < current
              const active = i === current
              return (
                <li key={s.phase} className={cn("flex items-start gap-3.5 transition-opacity", !done && !active && "opacity-35")}>
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && "border-primary text-primary",
                    )}
                  >
                    {done ? <CheckIcon className="size-3" /> : active ? <Spinner className="size-3" /> : null}
                  </span>
                  <span className="text-[15px] font-medium">{s.label}</span>
                </li>
              )
            })}
          </ol>
        </div>
    </div>
  )
}
