import { RevealHeading } from "./reveal-heading"
import { Reveal } from "@/components/site/motion/reveal"

/**
 * What actually leaves the device, drawn as plainly as possible:
 * [your browser: video + render] -> audio only -> [speech-to-text] -> text back.
 */
export function Privacy() {
  return (
    <section id="privacy" className="bg-paper-2 scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-16">
          <RevealHeading text="Your video stays on your laptop. *Seriously.*" className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl" />
          <Reveal delay={0.1}>
          <p className="text-muted-foreground max-w-md text-lg leading-relaxed text-pretty lg:pb-2">
            Decoding, preview and the final render all happen in your browser. The only thing that leaves is a compressed audio
            track, and the speech-to-text service sends back words and timings. It doesn&apos;t keep the audio. We don&apos;t
            either.
          </p>
          </Reveal>
        </div>

        <figure aria-label="Data flow diagram" className="grid items-stretch gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.6fr)_minmax(0,1fr)] md:gap-0">
          {/* device */}
          <div className="bg-card flex flex-col gap-4 rounded-lg border border-white/25 p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Your browser</span>
              <span className="text-muted-foreground font-mono text-xs uppercase">on your device</span>
            </div>
            <ul className="grid grid-cols-3 gap-2 font-mono text-xs">
              {["video file", "preview", "MP4 render"].map((x) => (
                <li key={x} className="rounded-[4px] border border-white/15 bg-[#1c1c1c] px-2 py-2 text-center">
                  {x}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-sm">The video file never gets uploaded. Only its audio track leaves.</p>
          </div>

          {/* wire */}
          <div className="text-muted-foreground flex justify-center gap-8 py-1 font-mono text-xs uppercase md:hidden">
            <span>↓ audio only</span>
            <span>↑ words + timings</span>
          </div>
          <div className="hidden flex-col justify-center gap-5 px-2 md:flex">
            <Wire label="audio only" dir="out" />
            <Wire label="words + timings" dir="back" />
          </div>

          {/* service */}
          <div className="flex flex-col gap-4 rounded-lg border border-dashed border-white/35 p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Speech-to-text</span>
              <span className="text-muted-foreground font-mono text-xs uppercase">server</span>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              <span className="rounded-[4px] border border-white/15 px-2 py-2">transcribe</span>
              <span className="rounded-[4px] border border-white/15 px-2 py-2">detect language</span>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="text-signal font-mono text-xs uppercase">stored:</span> nothing
            </p>
          </div>
        </figure>
      </div>
    </section>
  )
}

function Wire({ label, dir }: { label: string; dir: "out" | "back" }) {
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <span className="text-muted-foreground font-mono text-xs whitespace-nowrap uppercase">{label}</span>
      <span className={`flex w-full items-center ${dir === "back" ? "flex-row-reverse" : ""}`}>
        <span className="h-px flex-1 bg-white/50" />
        <span aria-hidden className="text-white/70 -mx-0.5 text-xs leading-none">
          {dir === "out" ? "▶" : "◀"}
        </span>
      </span>
    </div>
  )
}
