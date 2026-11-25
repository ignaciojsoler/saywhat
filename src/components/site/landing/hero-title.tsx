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
              <span
                className="hero-chrome-word italic"
                style={{
                  background: "linear-gradient(100deg, #f5f5f5 0%, #8a8a8a 22%, #ffffff 38%, #6b6b6b 55%, #e8e8e8 72%, #9a9a9a 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {w}
              </span>
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
