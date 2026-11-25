/** Verifiable product facts only: no logos, no user counts, no ratings. */
const FACTS = [
  "Runs in your browser",
  "Audio-only upload, not stored",
  "Auto language detection",
  "MP4 · SRT · VTT",
  "9:16 · 1:1 · 16:9",
  "Failed = refunded",
  "Credits never expire",
]

export function ProofStrip() {
  const items = [...FACTS, ...FACTS]
  return (
    <section aria-label="What you get" className="bg-paper-2 border-b overflow-hidden">
      <div className="relative py-4">
        <div
          className="proof-marquee flex w-max gap-x-6 font-mono text-xs tracking-wide text-muted-foreground uppercase"
        >
          {items.map((f, i) => (
            <span key={i} className="flex items-center gap-2 px-3">
              <span aria-hidden className="size-1 bg-white/35" />
              {f}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--background)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--background)] to-transparent" />
      </div>
    </section>
  )
}
