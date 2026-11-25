import type { CSSProperties, ReactNode } from "react"
import { AbsoluteFill, interpolate, interpolateColors, useCurrentFrame } from "remotion"
import { Caption, PRESETS } from "./caption"
import { cue, DURATION_FRAMES } from "./timing"
import { Abs, C, envelope, FONT, Icon, ICON, outlineShadow, pop, prog, rise, Wordmark } from "./ui"

/*
 * Layout rule: everything lives in the top ~70% of the frame (y < 1300). The lower ~30% stays
 * calm because the landing page overlays Saywhat's live captions of the voiceover there.
 */

// Voiceover cues (frames)
const T = {
  drop: cue("Drop"),
  saywhat: cue("Saywhat"),
  wordByWordEnd: cue("word", 1, "e"),
  pick: cue("Pick"),
  presets: [cue("Pop", 1), cue("Karaoke"), cue("Punch"), cue("Boxed"), cue("Clean")],
  wrong: cue("Wrong"),
  fix: cue("fix"),
  doc: cue("doc"),
  then: cue("Then"),
  export: cue("export"),
  mp4: cue("MP4"),
  burnedEnd: cue("in", 1, "e"),
  grab: cue("grab"),
  srt: cue("SRT"),
  it: cue("all") - 3, // "It all runs…" ("it" also occurs earlier in the script)
  browser: cue("browser"),
  nothing: cue("nothing"),
  no: cue("No"),
  subscription: cue("subscription"),
  pay: cue("Pay"),
  first: cue("first"),
  free: cue("free"),
  end: cue("Saywhat", 1),
}

// Phone geometry
const PH = { x: 260, y: 300, w: 560, h: 990, bezel: 12 }
const SW = PH.w - PH.bezel * 2
const SH = PH.h - PH.bezel * 2

export const Promo = () => {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT.sans, color: C.text }}>
      <Backdrop f={f} />
      <Hook f={f} />
      <PhoneSection f={f} />
      <Privacy f={f} />
      <Pricing f={f} />
      <EndCard f={f} />
    </AbsoluteFill>
  )
}

/** Neutral backdrop: soft light from the top and a faint dot grid that fades out before the caption zone. */
function Backdrop({ f }: { f: number }) {
  const drift = (f / DURATION_FRAMES) * 40
  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at 50% ${18 + drift / 10}%, rgba(255,255,255,0.07), rgba(255,255,255,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)",
          backgroundSize: "36px 36px",
          backgroundPosition: `0 ${-drift}px`,
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 45%, transparent 68%)",
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ 1. Hook */

function Hook({ f }: { f: number }) {
  const env = envelope(f, 0, T.drop - 8, 0) // fully visible on frame 0 (poster)
  if (!env) return null
  // Kinetic "karaoke" title: every word is on screen from frame 0 (so the poster reads well)
  // and lights up as it is spoken.
  const line = (text: string, word: string) => {
    const lit = prog(f, cue(word) - 2, 6)
    return (
      <div
        style={{
          fontSize: 112,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          lineHeight: 1.04,
          color: interpolateColors(lit, [0, 1], ["#3A3A3A", C.text]),
          transform: `scale(${1 + 0.04 * Math.sin(Math.PI * lit)})`,
          transformOrigin: "left center",
        }}
      >
        {text}
      </div>
    )
  }
  const p = pop(f, cue("pop") - 1, 9)
  return (
    <Abs style={{ inset: 0, ...env }}>
      <Abs style={{ left: 90, right: 90, top: 380 }}>
        {line("Your videos", "Your")}
        {line("deserve", "deserve")}
        {line("captions", "captions")}
        {line("that", "that")}
        <div
          style={{
            marginTop: 18,
            fontFamily: FONT.brand,
            fontWeight: 900,
            fontSize: 250,
            lineHeight: 1,
            textShadow: [...outlineShadow(0.08, "#000"), "0 0.05em 0.2em rgba(0,0,0,.7)"].join(", "),
            transformOrigin: "20% 70%",
            transform: `scale(${0.8 + 0.2 * p}) rotate(${(1 - p) * -6}deg)`,
            color: interpolateColors(Math.min(1, p), [0, 1], ["#3A3A3A", C.yellow]),
          }}
        >
          POP.
        </div>
      </Abs>
    </Abs>
  )
}

/* ------------------------------------------------------------------ 2. Phone walkthrough */

const STEPS = [
  { n: "01", label: "Upload", from: T.drop - 6 },
  { n: "02", label: "Transcribe", from: T.saywhat },
  { n: "03", label: "Style", from: T.pick - 4 },
  { n: "04", label: "Edit", from: T.wrong - 4 },
  { n: "05", label: "Export", from: T.then - 4 },
]
const PHONE_OUT = T.it - 6

function PhoneSection({ f }: { f: number }) {
  const start = STEPS[0].from
  if (f < start - 1 || f > PHONE_OUT + 12) return null
  const pin = prog(f, start, 16)
  const pout = prog(f, PHONE_OUT, 10, "inOut")
  const phoneStyle: CSSProperties = {
    opacity: pin * (1 - pout),
    transform: `translateY(${(1 - pin) * 220 + pout * -60}px) scale(${0.94 + 0.06 * pin - 0.04 * pout})`,
  }
  const stepIdx = STEPS.findLastIndex((s) => f >= s.from)
  return (
    <>
      <Abs style={{ left: 0, right: 0, top: 120, height: 150, opacity: 1 - pout }}>
        {STEPS.map((s, i) => (
          <StepLabel key={s.n} f={f} step={s} next={STEPS[i + 1]?.from ?? PHONE_OUT + 20} active={i === stepIdx} />
        ))}
      </Abs>
      <Abs style={{ left: PH.x, top: PH.y, width: PH.w, height: PH.h, ...phoneStyle }}>
        <Phone>
          <Screen f={f} a={STEPS[0].from} b={STEPS[1].from}>
            <UploadScreen f={f} />
          </Screen>
          <Screen f={f} a={STEPS[1].from} b={STEPS[2].from}>
            <TranscribeScreen f={f} />
          </Screen>
          <Screen f={f} a={STEPS[2].from} b={STEPS[3].from}>
            <StyleScreen f={f} />
          </Screen>
          <Screen f={f} a={STEPS[3].from} b={STEPS[4].from}>
            <EditScreen f={f} />
          </Screen>
          <Screen f={f} a={STEPS[4].from} b={PHONE_OUT + 30}>
            <ExportScreen f={f} />
          </Screen>
        </Phone>
      </Abs>
    </>
  )
}

function StepLabel({ f, step, next, active }: { f: number; step: (typeof STEPS)[number]; next: number; active: boolean }) {
  if (f < step.from - 1 || f > next + 10) return null
  const i = prog(f, step.from, 12)
  const o = prog(f, next, 8, "inOut")
  return (
    <Abs
      style={{
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        opacity: active ? i : 1 - o,
        transform: `translateY(${(1 - i) * 30 - o * 30}px)`,
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        {STEPS.map((s) => (
          <div
            key={s.n}
            style={{ width: s.n === step.n ? 44 : 12, height: 12, borderRadius: 6, background: s.n === step.n ? C.yellow : C.border }}
          />
        ))}
      </div>
      <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: "-0.035em" }}>{step.label}</div>
    </Abs>
  )
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 72,
        background: "#1A1A1A",
        boxShadow: "0 0 0 2px #2E2E2E, 0 40px 120px rgba(0,0,0,0.6), inset 0 0 0 1px #333",
        padding: PH.bezel,
      }}
    >
      <div style={{ position: "relative", width: SW, height: SH, borderRadius: 60, overflow: "hidden", background: "#050505" }}>
        {children}
        <Abs style={{ top: 18, left: SW / 2 - 60, width: 120, height: 34, borderRadius: 17, background: "#000", zIndex: 10 }} />
      </div>
    </div>
  )
}

/** Crossfading screen inside the phone. */
function Screen({ f, a, b, children }: { f: number; a: number; b: number; children: ReactNode }) {
  if (f < a - 1 || f > b + 8) return null
  const i = prog(f, a, 10)
  const o = prog(f, b, 8, "inOut")
  return (
    <Abs style={{ inset: 0, opacity: Math.min(i, 1 - o), transform: `translateX(${(1 - i) * 40 - o * 40}px)` }}>{children}</Abs>
  )
}

function AppBar() {
  return (
    <Abs style={{ top: 70, left: 28, right: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Wordmark size={34} />
      <div style={{ fontSize: 20, fontWeight: 600, color: C.muted, border: `1.5px solid ${C.border}`, borderRadius: 99, padding: "6px 14px" }}>
        3 free videos
      </div>
    </Abs>
  )
}

/** Abstract "creator on camera" frame (no stock footage). */
function FakeVideo({ f, w, h, style }: { f: number; w: number; h: number; style?: CSSProperties }) {
  const sway = Math.sin(f / 22) * 6
  const r = Math.min(w, h * 0.6) * 0.17
  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        background: "linear-gradient(170deg, #34312D 0%, #23211F 55%, #161514 100%)",
        ...style,
      }}
    >
      <Abs style={{ left: w * 0.08, top: h * 0.12, width: w * 0.22, height: h * 0.5, borderRadius: 8, background: "rgba(255,255,255,0.035)" }} />
      <Abs
        style={{
          left: w / 2 - r * 1.9 + sway,
          top: h * 0.3 + r * 1.75,
          width: r * 3.8,
          height: h,
          borderRadius: `${r * 1.6}px ${r * 1.6}px 0 0`,
          background: "linear-gradient(180deg, #4A4540, #34302C)",
        }}
      />
      <Abs
        style={{
          left: w / 2 - r + sway * 1.2,
          top: h * 0.3,
          width: r * 2,
          height: r * 2.3,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 35%, #6A625A, #45403B 70%)",
        }}
      />
    </div>
  )
}

function UploadScreen({ f }: { f: number }) {
  const t0 = T.drop
  const drop = pop(f, t0 + 2, 14)
  const bar = prog(f, t0 + 8, T.saywhat - t0 - 8, "inOut")
  return (
    <Abs style={{ inset: 0, background: "#0C0C0C" }}>
      <AppBar />
      <Abs
        style={{
          left: 28,
          right: 28,
          top: 170,
          height: 560,
          borderRadius: 32,
          border: `2.5px dashed ${bar > 0 ? C.yellow : "#383838"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          background: "rgba(255,225,77,0.03)",
        }}
      >
        <div style={{ transform: `translateY(${Math.sin(f / 6) * 4}px)` }}>
          <Icon d={ICON.upload} size={72} color={C.yellow} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 700 }}>Drop a video</div>
        <div style={{ fontSize: 22, color: C.muted }}>MP4 · MOV · WebM</div>
      </Abs>
      <Abs
        style={{
          left: 28,
          right: 28,
          top: 760,
          padding: 20,
          borderRadius: 26,
          background: C.surface2,
          border: `1.5px solid ${C.border}`,
          display: "flex",
          gap: 18,
          alignItems: "center",
          opacity: Math.min(1, drop * 1.5),
          transform: `translateY(${(1 - drop) * -260}px) rotate(${(1 - drop) * -6}deg)`,
        }}
      >
        <FakeVideo f={f} w={72} h={110} style={{ borderRadius: 12, flex: "none" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700 }}>my-clip.mp4</div>
          <div style={{ fontSize: 20, color: C.muted, marginTop: 4 }}>{bar < 1 ? "Reading audio…" : "Ready"}</div>
          <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: "#2C2C2C", overflow: "hidden" }}>
            <div style={{ width: `${bar * 100}%`, height: "100%", background: C.yellow }} />
          </div>
        </div>
      </Abs>
    </Abs>
  )
}

const SAMPLE = "okay so here's how I edit a whole video in like five minutes".split(" ")

function TranscribeScreen({ f }: { f: number }) {
  const a = T.saywhat + 6
  const b = T.wordByWordEnd
  const step = (b - a) / SAMPLE.length
  const shown = Math.floor((f - a) / step) + 1
  return (
    <Abs style={{ inset: 0, background: "#0C0C0C" }}>
      <FakeVideo f={f} w={SW} h={470} />
      <Abs
        style={{
          top: 400,
          left: 24,
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "8px 16px",
          borderRadius: 99,
          background: "rgba(0,0,0,0.6)",
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 5, background: C.yellow, opacity: 0.5 + 0.5 * Math.sin(f / 3) }} />
        {shown >= SAMPLE.length ? "Transcribed" : "Transcribing…"}
      </Abs>
      <Abs style={{ top: 500, left: 24, right: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 18 }}>
          Transcript
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {SAMPLE.map((w, i) => {
            const at = a + i * step
            const p = pop(f, at, 14)
            const latest = i === shown - 1
            return (
              <div
                key={i}
                style={{
                  fontSize: 30,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 14,
                  background: latest ? "rgba(255,225,77,0.12)" : C.surface2,
                  border: `1.5px solid ${latest ? C.yellow : C.border}`,
                  color: latest ? C.yellow : C.text,
                  opacity: f >= at ? Math.min(1, p * 1.5) : 0,
                  transform: `scale(${0.7 + 0.3 * p})`,
                }}
              >
                {w}
              </div>
            )
          })}
        </div>
      </Abs>
    </Abs>
  )
}

const STYLE_SAMPLE = ["this", "changes", "everything"]

function StyleScreen({ f }: { f: number }) {
  const idx = Math.max(0, T.presets.findLastIndex((t) => f >= t - 2))
  const preset = PRESETS[idx]
  const switchAt = idx === 0 ? STEPS[2].from : T.presets[idx] - 2
  const sp = pop(f, switchAt, 11)
  const active = Math.floor((f - STEPS[2].from) / 7) % STYLE_SAMPLE.length
  return (
    <Abs style={{ inset: 0 }}>
      <FakeVideo f={f} w={SW} h={SH} />
      <Abs style={{ top: 84, left: 0, right: 0, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, padding: "0 20px" }}>
        {PRESETS.map((p, i) => {
          const on = i === idx
          return (
            <div
              key={p.id}
              style={{
                fontSize: 22,
                fontWeight: 700,
                padding: "10px 18px",
                borderRadius: 99,
                background: on ? C.yellow : "rgba(0,0,0,0.55)",
                color: on ? "#0A0A0A" : C.text,
                border: `1.5px solid ${on ? C.yellow : "rgba(255,255,255,0.18)"}`,
                transform: on ? `scale(${1 + 0.08 * (1 - sp)})` : undefined,
              }}
            >
              {p.name}
            </div>
          )
        })}
      </Abs>
      <Abs
        style={{
          left: 18,
          right: 18,
          bottom: (preset.style.position / 100) * SH,
          transform: `scale(${0.85 + 0.15 * sp})`,
          opacity: Math.min(1, sp * 1.4),
        }}
      >
        <Caption words={STYLE_SAMPLE} active={active} style={preset.style} frameH={SH} />
      </Abs>
    </Abs>
  )
}

const DOC = "Rule number one: never trust your laptop".split(" ")

function EditScreen({ f }: { f: number }) {
  const a = STEPS[3].from
  // Cursor travels to the misheard word, clicks on "fix", then the word is retyped.
  const travel = prog(f, a + 4, T.wrong + 10 - a - 4, "inOut")
  const click = T.fix - 2
  const typeStart = T.fix + 4
  const typed = "mic.".slice(0, Math.max(0, Math.floor((f - typeStart) / 3)))
  const selected = f >= click && f < typeStart
  const fixed = f >= typeStart
  const done = typed.length === 4
  const flag = prog(f, T.wrong, 8)
  const word = fixed ? typed : "Mike."
  const capWord = done ? "MIC" : "MIKE"
  const pressed = f >= click && f < click + 4 ? 0.85 : 1
  const savedP = prog(f, T.doc, 10)
  return (
    <Abs style={{ inset: 0, background: "#0C0C0C" }}>
      <FakeVideo f={f} w={SW} h={420} />
      <Abs style={{ left: 10, right: 10, top: 290 }}>
        <Caption
          words={["your", "laptop", capWord]}
          active={2}
          style={{ ...PRESETS[0].style, activeColor: done ? C.yellow : "#ffffff" }}
          frameH={700}
        />
      </Abs>
      <Abs style={{ top: 460, left: 28, right: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Transcript</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 20,
              fontWeight: 600,
              color: C.yellow,
              opacity: savedP,
              transform: `translateY(${(1 - savedP) * 10}px)`,
            }}
          >
            <Icon d={ICON.check} size={22} color={C.yellow} stroke={2.6} /> Fixed
          </div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 500, lineHeight: 1.5, letterSpacing: "-0.01em", color: "#D4D4D4" }}>
          {DOC.join(" ")}{" "}
          <span
            style={{
              position: "relative",
              display: "inline-block",
              padding: "0 6px",
              margin: "0 -6px",
              borderRadius: 8,
              color: selected ? "#0A0A0A" : fixed ? C.text : C.text,
              background: selected ? C.yellow : fixed && !done ? "rgba(255,255,255,0.08)" : `rgba(255,225,77,${0.14 * flag * (done ? 0 : 1)})`,
              boxShadow: !selected && !fixed ? `inset 0 -4px 0 rgba(255,225,77,${flag})` : undefined,
              minWidth: fixed ? 20 : undefined,
            }}
          >
            {word}
            {fixed && !done && (
              <span style={{ display: "inline-block", width: 3, height: "1em", marginLeft: 2, verticalAlign: "-0.12em", background: C.yellow }} />
            )}
          </span>
        </div>
        <div style={{ marginTop: 26, fontSize: 40, fontWeight: 500, lineHeight: 1.5, color: "#5A5A5A" }}>
          It picks up everything.
        </div>
      </Abs>
      {/* pointer */}
      <Abs
        style={{
          left: interpolate(travel, [0, 1], [420, 250]),
          top: interpolate(travel, [0, 1], [900, 640]),
          opacity: prog(f, a + 2, 6) * (1 - prog(f, typeStart + 4, 6)),
          transform: `scale(${pressed})`,
          transformOrigin: "0 0",
        }}
      >
        <svg width="44" height="44" viewBox="0 0 24 24">
          <path d="M5 3l14 8-6 1.5L10 19z" fill="#fff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </Abs>
    </Abs>
  )
}

function ExportScreen({ f }: { f: number }) {
  const a = T.export
  const b = T.burnedEnd
  const bar = prog(f, a + 4, b - a - 4, "inOut")
  const done = bar >= 1
  const doneP = pop(f, b, 13)
  const srtOn = f >= T.srt - 2
  const srtP = pop(f, T.srt - 2, 12)
  const pressed = f >= a && f < a + 4 ? 0.96 : 1
  const formats = ["MP4", "SRT", "VTT"]
  return (
    <Abs style={{ inset: 0, background: "#0C0C0C" }}>
      <AppBar />
      <Abs style={{ top: 150, left: SW / 2 - 150, width: 300, height: 450, borderRadius: 26, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}>
        <FakeVideo f={f} w={300} h={450} />
        <Abs style={{ left: 0, right: 0, bottom: 70 }}>
          <Caption words={["your", "laptop", "mic"]} active={2} style={PRESETS[0].style} frameH={450} />
        </Abs>
        {done && (
          <Abs
            style={{
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `rgba(0,0,0,${0.45 * Math.min(1, doneP)})`,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                background: C.yellow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${doneP})`,
              }}
            >
              <Icon d={ICON.check} size={56} color="#0A0A0A" stroke={3} />
            </div>
          </Abs>
        )}
      </Abs>
      <Abs style={{ top: 630, left: 28, right: 28 }}>
        <div style={{ display: "flex", gap: 10, padding: 6, borderRadius: 18, background: C.surface2, border: `1.5px solid ${C.border}` }}>
          {formats.map((fm) => {
            const on = fm === "MP4" ? !srtOn : fm === "SRT" && srtOn
            return (
              <div
                key={fm}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: 700,
                  padding: "12px 0",
                  borderRadius: 13,
                  background: on ? "#2E2E2E" : "transparent",
                  color: on ? C.text : C.muted,
                  transform: fm === "SRT" && srtOn ? `scale(${0.9 + 0.1 * srtP})` : undefined,
                }}
              >
                {fm}
              </div>
            )
          })}
        </div>
        <div
          style={{
            position: "relative",
            marginTop: 22,
            height: 84,
            borderRadius: 22,
            overflow: "hidden",
            background: bar > 0 && !done ? "#262626" : C.yellow,
            transform: `scale(${pressed})`,
          }}
        >
          {bar > 0 && !done ? (
            <>
              {/* Two copies of the label: light on the track, dark on the yellow fill (clipped). */}
              <ButtonLabel color={C.text}>Burning in captions… {Math.round(bar * 100)}%</ButtonLabel>
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - bar * 100}% 0 0)`, background: C.yellow }}>
                <ButtonLabel color="#0A0A0A">Burning in captions… {Math.round(bar * 100)}%</ButtonLabel>
              </div>
            </>
          ) : (
            <ButtonLabel color="#0A0A0A">
              {srtOn ? (
                <>
                  <Icon d={ICON.download} size={30} color="#0A0A0A" stroke={2.6} /> Download .srt
                </>
              ) : done ? (
                <>
                  <Icon d={ICON.download} size={30} color="#0A0A0A" stroke={2.6} /> my-clip.mp4
                </>
              ) : (
                "Export MP4"
              )}
            </ButtonLabel>
          )}
        </div>
      </Abs>
    </Abs>
  )
}

function ButtonLabel({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontSize: 28,
        fontWeight: 800,
        color,
      }}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ 3. Privacy */

function Privacy({ f }: { f: number }) {
  const env = envelope(f, T.it - 2, T.no - 6)
  if (!env) return null
  const nothingP = pop(f, T.nothing - 2, 12)
  const flow = ((f - T.it) / 30) % 1
  return (
    <Abs style={{ inset: 0, ...env }}>
      <Abs style={{ top: 170, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ ...rise(f, T.it, 40), fontSize: 92, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.05 }}>
          Runs in your
          <br />
          <span style={{ color: C.yellow }}>browser</span>
        </div>
      </Abs>
      {/* browser window */}
      <Abs
        style={{
          left: 110,
          right: 110,
          top: 460,
          height: 560,
          borderRadius: 32,
          background: C.surface,
          border: `2px solid ${C.border}`,
          overflow: "hidden",
          ...rise(f, T.it + 4, 60, 16),
        }}
      >
        <div style={{ height: 70, display: "flex", alignItems: "center", gap: 12, padding: "0 26px", borderBottom: `2px solid ${C.border}` }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "#333" }} />
          ))}
          <div
            style={{
              marginLeft: 18,
              flex: 1,
              height: 40,
              borderRadius: 20,
              background: C.surface2,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 18px",
              color: C.muted,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            <Icon d={ICON.lock} size={20} color={C.muted} /> saywhat
          </div>
        </div>
        <div style={{ position: "relative", height: 490, display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <FakeVideo f={f} w={190} h={290} style={{ borderRadius: 20 }} />
            <div style={{ fontSize: 22, fontWeight: 600, color: C.muted }}>Video stays here</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative", width: 200, height: 4, borderRadius: 2, background: "#2A2A2A", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: `${flow * 140 - 40}%`, width: "40%", height: "100%", background: C.yellow }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 600 }}>
              <Icon d={ICON.wave} size={28} color={C.yellow} /> Audio only
            </div>
            <div style={{ fontSize: 20, color: C.muted }}>for transcription</div>
          </div>
        </div>
      </Abs>
      <Abs style={{ left: 0, right: 0, top: 1060, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 34px",
            borderRadius: 99,
            background: C.yellow,
            color: "#0A0A0A",
            fontSize: 36,
            fontWeight: 800,
            opacity: f >= T.nothing - 2 ? Math.min(1, nothingP * 1.5) : 0,
            transform: `scale(${0.6 + 0.4 * nothingP})`,
          }}
        >
          <Icon d={ICON.shield} size={38} color="#0A0A0A" stroke={2.4} /> Nothing stored
        </div>
      </Abs>
    </Abs>
  )
}

/* ------------------------------------------------------------------ 4. Pricing */

function Pricing({ f }: { f: number }) {
  const env = envelope(f, T.no - 4, T.end - 8)
  if (!env) return null
  const strike = prog(f, T.subscription + 10, 12, "inOut")
  const threeP = pop(f, T.first - 2, 9)
  return (
    <Abs style={{ inset: 0, ...env }}>
      <Abs style={{ top: 230, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ ...rise(f, T.no - 2, 40), fontSize: 40, fontWeight: 600, color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          No
        </div>
        <div style={{ ...rise(f, T.subscription, 40), position: "relative", display: "inline-block", fontSize: 108, fontWeight: 800, letterSpacing: "-0.04em", color: strike > 0.5 ? "#6B6B6B" : C.text }}>
          subscription
          <div
            style={{
              position: "absolute",
              left: -10,
              top: "54%",
              height: 10,
              borderRadius: 5,
              width: `calc(${strike * 100}% + 20px)`,
              background: C.yellow,
              opacity: strike > 0 ? 1 : 0,
            }}
          />
        </div>
        <div style={{ ...rise(f, T.pay - 2, 40), marginTop: 26, fontSize: 64, fontWeight: 700, letterSpacing: "-0.03em" }}>
          Pay per video.
        </div>
      </Abs>
      <Abs style={{ top: 640, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontFamily: FONT.brand,
            fontWeight: 900,
            fontSize: 380,
            lineHeight: 1,
            color: C.yellow,
            textShadow: [...outlineShadow(0.06, "#000"), "0 0.04em 0.2em rgba(0,0,0,.7)"].join(", "),
            transform: `scale(${threeP})`,
            opacity: f >= T.first - 2 ? 1 : 0,
          }}
        >
          3
        </div>
        <div style={{ ...rise(f, T.free - 3, 30), fontSize: 64, fontWeight: 800, letterSpacing: "-0.03em", marginTop: -10 }}>
          free videos
        </div>
      </Abs>
    </Abs>
  )
}

/* ------------------------------------------------------------------ 5. End card */

function EndCard({ f }: { f: number }) {
  if (f < T.end - 8) return null
  const p = pop(f, T.end - 6, 10)
  const sub = rise(f, T.end + 8, 24)
  return (
    <Abs style={{ inset: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 560 }}>
      <Wordmark size={190} style={{ transform: `scale(${p})`, opacity: Math.min(1, p * 2) }} />
      <div style={{ ...sub, marginTop: 50, display: "flex", gap: 16 }}>
        {["3 free videos", "No subscription"].map((t) => (
          <div key={t} style={{ fontSize: 32, fontWeight: 600, padding: "14px 26px", borderRadius: 99, border: `2px solid ${C.border}`, color: "#D4D4D4" }}>
            {t}
          </div>
        ))}
      </div>
    </Abs>
  )
}
