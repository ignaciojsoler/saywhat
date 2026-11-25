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
  return (
    <section aria-label="What you get" className="bg-paper-2 border-b">
      <ul className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-4 font-mono text-xs tracking-wide text-muted-foreground uppercase sm:px-6">
        {FACTS.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span aria-hidden className="size-1 bg-white/35" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  )
}
