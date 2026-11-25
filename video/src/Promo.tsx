import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion"
import { Abs, C, EASE, FONT, Headline, outline, prog, reveal, scene, spr } from "./ui"
import { DURATION_FRAMES, FPS, WORDS, cue } from "./timing"

/*
 * Promo — 1080x1920, 30 fps. No burned-in captions (site overlays its own).
 * Content lives in the upper 70% (y 120..1300); bottom 30% is empty.
 */

const T = {
  product: cue("Saywhat", 0),
  ease: cue("No", 0),
  payoff: cue("More", 0),
  end: cue("Caption"),
  total: DURATION_FRAMES,
}

const S = WORDS.map((w) => Math.round(w.s * FPS))
const E = WORDS.map((w) => Math.round(w.e * FPS))

const PHONE_W = 620
const PHONE_H = Math.round(PHONE_W * 16 / 9) // 9:16
const PHONE_LEFT = (1080 - PHONE_W) / 2
const PHONE_TOP = 710 - PHONE_H / 2

// line-2 caption words shown inside the phone
const PHONE_WORDS = [16, 18, 21, 25] // bold, captions, attention, watching

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k)

export const Promo = () => {
  const f = useCurrentFrame()
  const cam = 1 + 0.03 * (f / DURATION_FRAMES)
  return (
    <AbsoluteFill style={{ background: C.bg, color: C.text, fontFamily: FONT.display }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${cam})`, transformOrigin: "50% 50%" }}>
        <Backdrop />
        <Hook f={f} />
        <Product f={f} />
        <EaseScene f={f} />
        <Payoff f={f} />
        <EndCard f={f} />
      </div>
    </AbsoluteFill>
  )
}

function Backdrop() {
  return (
    <>
      <AbsoluteFill style={{ background: C.bg }} />
      <AbsoluteFill
        style={{
          background: "radial-gradient(860px 640px at 50% 24%, rgba(255,255,255,0.06), rgba(255,255,255,0) 70%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(1100px 900px at 50% 72%, rgba(255,225,77,0.035), rgba(255,225,77,0) 72%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(130% 90% at 50% 50%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ 1. Hook */

function Hook({ f }: { f: number }) {
  const env = scene(f, 0, T.product - 8, 10, 12)
  if (!env) return null
  const sweepIn = prog(f, cue("one") - 5, 10)
  const sweep = prog(f, cue("one"), 30, EASE.out)
  const hs = { letterSpacing: "-0.03em", maxWidth: 900 }
  return (
    <Abs style={env}>
      <Abs
        style={{
          top: 120,
          left: 0,
          right: 0,
          height: 1180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 34,
        }}
      >
        <Headline f={f} at={[2, 8]} parts={[{ t: "One " }, { t: "second.", serif: true }]} size={164} style={hs} />
        <Abs
          style={{
            width: 760,
            height: 6,
            borderRadius: 3,
            background: C.line,
            opacity: sweepIn,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${sweep * 100}%`,
              height: "100%",
              borderRadius: 3,
              background: C.yellow,
              boxShadow: "0 0 18px rgba(255,225,77,0.55)",
            }}
          />
        </Abs>
        <Headline
          f={f}
          at={[cue("Make"), cue("it"), cue("count")]}
          parts={[{ t: "Make " }, { t: "it " }, { t: "count.", color: C.yellow }]}
          size={164}
          style={hs}
        />
      </Abs>
    </Abs>
  )
}

/* ------------------------------------------------------------------ 2. Product */

function Product({ f }: { f: number }) {
  const env = scene(f, T.product - 2, T.ease - 8, 14, 12)
  if (!env) return null
  return (
    <Abs style={env}>
      <Phone f={f} />
    </Abs>
  )
}

function Phone({ f }: { f: number }) {
  const drift = prog(f, T.product, T.ease - T.product, EASE.soft)
  const lightDrift = (Math.sin(f * 0.04) * 0.5 + 0.5) * 1
  // phone caption word
  let activeIdx = -1
  for (let k = 0; k < PHONE_WORDS.length; k++) {
    const wi = PHONE_WORDS[k]
    const nextWi = k < PHONE_WORDS.length - 1 ? PHONE_WORDS[k + 1] : null
    const start = S[wi]
    const end = nextWi ? S[nextWi] : E[wi] + 30
    if (f >= start && f < end) {
      activeIdx = k
      break
    }
  }
  const scrubLin = Math.min(1, Math.max(0, (f - T.product) / (T.ease - T.product)))
  return (
    <div
      style={{
        position: "absolute",
        left: PHONE_LEFT,
        top: PHONE_TOP,
        width: PHONE_W,
        height: PHONE_H,
        borderRadius: 52,
        border: `2px solid rgba(255,255,255,0.12)`,
        background: "#0C0C0C",
        padding: 12,
        boxShadow: "0 60px 140px rgba(0,0,0,0.65)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 40,
          overflow: "hidden",
          background: "#111",
        }}
      >
        {/* warm gradient backdrop */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(165deg, #4A3A26 0%, #2A2218 42%, #0D0C0B 100%)",
            transform: `scale(${1 + 0.04 * drift})`,
            transformOrigin: "50% 45%",
          }}
        />
        {/* blurred circular light source drifting */}
        <div
          style={{
            position: "absolute",
            left: `${20 + 30 * lightDrift}%`,
            top: `${10 + 20 * (1 - lightDrift)}%`,
            width: "70%",
            height: "55%",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,225,77,0.22), rgba(255,225,77,0) 70%)",
            filter: "blur(40px)",
            transform: `translate(${12 * drift}px, ${-8 * drift}px)`,
          }}
        />
        {/* vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(120% 80% at 50% 75%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* film grain */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.09, pointerEvents: "none", mixBlendMode: "overlay" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>

        {/* one big caption word */}
        {activeIdx >= 0 && (() => {
          const wi = PHONE_WORDS[activeIdx]
          const sp = spr(f, S[wi], 12, 180)
          const scale = 0.85 + 0.15 * sp
          const blur = (1 - sp) * 12
          return (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: "28%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  fontFamily: FONT.caption,
                  fontWeight: 900,
                  fontSize: 108,
                  lineHeight: 1,
                  color: C.yellow,
                  textShadow: [...outline(0.06), "0 8px 24px rgba(0,0,0,0.5)"].join(", "),
                  transform: `scale(${scale})`,
                  filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
                  opacity: sp,
                }}
              >
                {WORDS[wi].w.replace(/[.,]/g, "")}
              </div>
            </div>
          )
        })()}

        {/* scrubber */}
        <div
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: 18,
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.18)",
            overflow: "hidden",
          }}
        >
          <div style={{ width: `${scrubLin * 100}%`, height: "100%", background: C.yellow, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 3. Ease */

function EaseScene({ f }: { f: number }) {
  const env = scene(f, T.ease - 2, T.payoff - 8, 14, 12)
  if (!env) return null
  return (
    <Abs style={env}>
      <Abs
        style={{
          top: 120,
          left: 0,
          right: 0,
          height: 1180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <StruckLine f={f} text="No editing skills." at={cue("No", 0) - 2} strikeAt={cue("skills") - 6} size={96} />
        <StruckLine f={f} text="No timeline." at={cue("No", 1) - 2} strikeAt={cue("timeline") - 6} size={96} />
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 120,
            lineHeight: 1,
            letterSpacing: "-0.045em",
            textAlign: "center",
            maxWidth: 900,
            marginTop: 24,
          }}
        >
          {["Ready ", "in ", "minutes."].map((w, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                color: i === 2 ? C.yellow : C.text,
                textShadow: i === 2 ? "0 0 28px rgba(255,225,77,0.45)" : undefined,
                ...reveal(f, i === 0 ? cue("Just") - 2 : i === 1 ? cue("Just") + 2 : cue("Just") + 6),
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </Abs>
    </Abs>
  )
}

function StruckLine({ f, text, at, strikeAt, size }: { f: number; text: string; at: number; strikeAt: number; size: number }) {
  const p = prog(f, strikeAt, 18, EASE.inOut)
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: 900 }}>
      <div
        style={{
          display: "flex",
          gap: "0.26em",
          fontFamily: FONT.display,
          fontWeight: 600,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: "-0.045em",
          whiteSpace: "pre",
        }}
      >
        {text.split(" ").map((w, i) => (
          <span key={i} style={{ display: "inline-block", ...reveal(f, at + i * 4) }}>
            {w}
          </span>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: "-1%",
          width: "102%",
          top: "53%",
          height: 5,
          borderRadius: 3,
          background: C.yellow,
          transform: `rotate(-1.2deg) scaleX(${p})`,
          transformOrigin: "left center",
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ 4. Payoff */

const PAYOFF_PATH = "M 12 386 C 128 378 206 336 298 298 C 388 260 456 200 538 152 C 610 110 684 52 748 22"

function Payoff({ f }: { f: number }) {
  const env = scene(f, T.payoff - 2, T.end - 8, 14, 12)
  if (!env) return null
  const draw = prog(f, cue("watch") - 2, 44, EASE.inOut)
  return (
    <Abs style={env}>
      <Abs
        style={{
          top: 120,
          left: 0,
          right: 0,
          height: 1180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <Headline
          f={f}
          at={[cue("More", 0) - 1, cue("watch") - 1, cue("time") - 1]}
          parts={[{ t: "More " }, { t: "watch " }, { t: "time." }]}
          size={121}
          dur={12}
          style={{ maxWidth: 900 }}
        />
        <Headline
          f={f}
          at={[cue("More", 1) - 1, cue("views") - 1]}
          parts={[{ t: "More " }, { t: "views.", color: C.yellow }]}
          size={121}
          dur={12}
          style={{ maxWidth: 900 }}
        />
        <div style={{ position: "relative", width: 760, height: 420, marginTop: 20 }}>
          <svg width={760} height={420} viewBox="0 0 760 420" style={{ overflow: "visible", filter: "drop-shadow(0 0 16px rgba(255,225,77,0.4))" }}>
            <path
              d={PAYOFF_PATH}
              fill="none"
              stroke={C.yellow}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={1000}
              strokeDashoffset={1000 * (1 - draw)}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 14,
              height: 14,
              offsetPath: `path("${PAYOFF_PATH}")`,
              offsetDistance: `${draw * 100}%`,
              offsetAnchor: "center",
              borderRadius: "50%",
              background: C.yellow,
              boxShadow: "0 0 18px rgba(255,225,77,0.8)",
            }}
          />
        </div>
      </Abs>
    </Abs>
  )
}

/* ------------------------------------------------------------------ 5. End card */

function EndCard({ f }: { f: number }) {
  const env = scene(f, T.end - 4, DURATION_FRAMES + 100, 14, 12)
  if (!env) return null
  const p = prog(f, T.end, 26, EASE.soft)
  const ps = prog(f, T.end + 18, 18)
  const drift = prog(f, T.end + 10, Math.max(1, DURATION_FRAMES - T.end - 10), EASE.soft)
  return (
    <Abs style={env}>
      <Abs style={{ inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 64, transform: "translateY(-40px)" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "absolute",
              width: 760,
              height: 380,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,225,77,0.10), rgba(255,225,77,0) 68%)",
              filter: "blur(10px)",
              opacity: p,
            }}
          />
          <Img
            src={staticFile("logo.svg")}
            style={{
              position: "relative",
              width: 520,
              opacity: p,
              transform: `scale(${0.94 + 0.06 * p + 0.02 * drift})`,
              filter: p < 1 ? `blur(${(1 - p) * 18}px)` : undefined,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 400,
            fontSize: 44,
            letterSpacing: "-0.01em",
            color: "rgba(250,250,255,0.58)",
            maxWidth: 900,
            opacity: ps,
            transform: `translateY(${(1 - ps) * 16}px)`,
            filter: ps < 1 ? `blur(${(1 - ps) * 10}px)` : undefined,
          }}
        >
          Caption your next video
        </div>
      </Abs>
    </Abs>
  )
}