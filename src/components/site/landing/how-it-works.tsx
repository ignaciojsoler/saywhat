import { RevealHeading } from "./reveal-heading"
import { Reveal } from "@/components/site/motion/reveal"
import { Stagger, StaggerItem } from "@/components/site/motion/stagger"
import { DrawLine } from "@/components/site/motion/draw-line"

/** Three clips on an editor timeline. Positions are % of the 60 s ruler. */
const STEPS = [
  {
    at: "00:00",
    title: "Drop",
    text: "Drag in a clip from your phone or laptop. Any language, detected automatically.",
    visual: <DropVisual />,
  },
  {
    at: "00:20",
    title: "Fix",
    text: "Words come back timed and grouped into short lines. Fix the odd one, pick a style.",
    visual: <FixVisual />,
  },
  {
    at: "00:45",
    title: "Export",
    text: "Download an MP4 with the captions burned in, or SRT/VTT for your editor.",
    visual: <ExportVisual />,
  },
]

const TICKS = Array.from({ length: 13 }, (_, i) => i * 5)

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-b py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
          <RevealHeading text="Raw clip to posted in *under a minute.*" className="font-display max-w-2xl text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl" />
          <Reveal delay={0.1}>
            <p className="text-muted-foreground max-w-xs text-pretty md:pb-2">For a short clip, roughly. No timeline to scrub. Ironic, given this one.</p>
          </Reveal>
        </div>

        <div className="relative mt-14">
          {/* ruler (desktop): ticks every 5 s, a playhead sweeping across */}
          <div aria-hidden className="relative hidden h-8 border-b md:block">
            {TICKS.map((s) => (
              <span key={s} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center gap-1" style={{ left: `${(s / 60) * 100}%` }}>
                {s % 15 === 0 && <span className="text-muted-foreground font-mono text-xs tabular-nums">{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>}
                <span className={s % 15 === 0 ? "h-2.5 w-px bg-white/40" : "h-1.5 w-px bg-white/20"} />
              </span>
            ))}
          </div>
          <span aria-hidden className="playhead bg-signal pointer-events-none absolute top-6 bottom-0 z-10 hidden w-px md:block">
            <span className="bg-signal absolute -top-1 -left-[4px] size-[9px] rounded-[2px]" />
          </span>

          <DrawLine className="hidden h-px w-full bg-white/30 md:block" />
          <Stagger>
          <ol className="grid gap-px overflow-hidden rounded-lg border bg-white/10 md:mt-3 md:grid-cols-[20fr_25fr_15fr] md:rounded-md">
            {STEPS.map((s, i) => (
              <StaggerItem as="li" key={s.title} className="bg-card relative flex flex-col gap-5 p-5 sm:p-6">
                <span aria-hidden className="pointer-events-none absolute right-3 top-2 font-display text-7xl font-bold leading-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.15)", color: "transparent" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-2xl font-semibold tracking-tight">{s.title}</span>
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">{s.at}</span>
                </div>
                <div className="flex h-24 items-center">{s.visual}</div>
                <p className="text-muted-foreground text-[15px] leading-relaxed">{s.text}</p>
              </StaggerItem>
            ))}
          </ol>
          </Stagger>
        </div>
      </div>
    </section>
  )
}

function DropVisual() {
  return (
    <div className="flex w-full items-center gap-3 rounded-md border border-dashed border-white/30 p-3">
      <span className="grid h-12 w-[27px] shrink-0 place-items-center rounded-[3px] bg-white/10 font-mono text-[10px] text-white/80">9:16</span>
      <span className="flex min-w-0 flex-col font-mono text-xs leading-snug">
        <span className="truncate">forest-take-3.webm</span>
        <span className="text-muted-foreground">00:15 · 0.8 MB</span>
      </span>
    </div>
  )
}

function FixVisual() {
  return (
    <div className="flex w-full flex-col gap-1 font-mono text-xs">
      <div className="flex gap-2.5 rounded-[4px] px-2 py-1">
        <span className="text-muted-foreground">00:12.32</span>
        <span>If I&apos;m not</span>
      </div>
      <div className="flex gap-2.5 rounded-[4px] border-l-2 border-white/70 bg-white/[0.05] px-2 py-1">
        <span className="text-signal">00:12.86</span>
        <span>
          taking <s className="text-muted-foreground decoration-[var(--signal)]">Bethany</s> botany,
        </span>
      </div>
    </div>
  )
}

function ExportVisual() {
  return (
    <div className="flex w-full items-end gap-4">
      <div className="flex items-end gap-1.5" aria-label="Aspect ratios 9:16, 1:1, 16:9">
        <span className="h-12 w-[27px] rounded-[3px] border border-white/70" />
        <span className="size-8 rounded-[3px] border border-white/50" />
        <span className="h-6 w-[43px] rounded-[3px] border border-white/50" />
      </div>
      <div className="flex flex-col gap-1 font-mono text-xs">
        <span className="rounded-[3px] bg-white px-1.5 py-0.5 text-center text-[#0a0a0a]">MP4</span>
        <span className="flex gap-1">
          <span className="rounded-[3px] border border-white/30 px-1.5 py-0.5">SRT</span>
          <span className="rounded-[3px] border border-white/30 px-1.5 py-0.5">VTT</span>
        </span>
      </div>
    </div>
  )
}
