"use client"


const WORDS = ["Captions", "people", "actually", "read."]

export function HeroTitle() {
  return (
    <h1
      aria-label={WORDS.join(" ")}
      className="font-hero text-[clamp(3.4rem,7.2vw,7rem)] font-extrabold tracking-[-0.035em] leading-[0.92] text-white"
      style={{ fontStretch: "112%", fontVariationSettings: '"wdth" 112' }}
    >
      {WORDS.map((w) => {
        if (w === "actually") {
          return (
            <span key={w} aria-hidden className="block">
              <span className="text-primary pr-[0.06em] italic">{w}</span>
            </span>
          )
        }
        return (
          <span key={w} aria-hidden className="block">
            {w}
          </span>
        )
      })}
    </h1>
  )
}
