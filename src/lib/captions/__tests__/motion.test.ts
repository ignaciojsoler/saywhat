import { describe, expect, it } from "vitest"
import { captionFrame, entrancePose, MOTION } from "../animate"
import { contrastInk, cubicBezier, ease, mixColor, parseColor, progress, spring } from "../motion"
import { DEFAULT_STYLE, migrateStyle, PRESETS, presetById } from "../presets"
import { groupWords } from "../timing"
import type { CaptionStyle, Word } from "../types"

const W = (w: string, s: number, e: number): Word => ({ w, s, e })
const words = [W("one", 1, 1.3), W("two", 1.4, 1.7), W("three.", 1.8, 2.2), W("four", 5, 5.4)]
const lines = groupWords(words, 4)
const style = (patch: Partial<CaptionStyle> = {}): CaptionStyle => ({ ...DEFAULT_STYLE, ...patch })

describe("cubicBezier", () => {
  it("hits the endpoints and is monotonic for standard curves", () => {
    for (const f of Object.values(ease)) {
      expect(f(0)).toBe(0)
      expect(f(1)).toBe(1)
      let prev = 0
      for (let x = 0.01; x <= 1; x += 0.01) {
        const y = f(x)
        expect(y).toBeGreaterThanOrEqual(prev - 1e-9)
        prev = y
      }
    }
  })
  it("linear control points give the identity", () => {
    const lin = cubicBezier(0.25, 0.25, 0.75, 0.75)
    for (const x of [0.1, 0.33, 0.5, 0.9]) expect(lin(x)).toBeCloseTo(x, 5)
  })
  it("matches known values of CSS ease (0.25, 0.1, 0.25, 1)", () => {
    const cssEase = cubicBezier(0.25, 0.1, 0.25, 1)
    expect(cssEase(0.5)).toBeCloseTo(0.8024, 3)
    expect(cssEase(0.25)).toBeCloseTo(0.4085, 3)
  })
  it("expo-out front-loads the motion", () => {
    expect(ease.outExpo(0.2)).toBeGreaterThan(0.6)
  })
  it("clamps outside [0, 1]", () => {
    expect(ease.outExpo(-1)).toBe(0)
    expect(ease.outExpo(2)).toBe(1)
  })
})

describe("spring", () => {
  it("starts at 0 and settles at 1", () => {
    expect(spring(0, 19, 0.58)).toBe(0)
    expect(spring(-1, 19, 0.58)).toBe(0)
    expect(spring(2, 19, 0.58)).toBeCloseTo(1, 4)
  })
  it("under-damped overshoots a little, critically damped never does", () => {
    let peak = 0
    let crit = 0
    for (let t = 0; t < 1; t += 0.002) {
      peak = Math.max(peak, spring(t, 19, 0.58))
      crit = Math.max(crit, spring(t, 19, 1))
    }
    expect(peak).toBeGreaterThan(1.03)
    expect(peak).toBeLessThan(1.12)
    expect(crit).toBeLessThanOrEqual(1)
  })
})

describe("progress & color", () => {
  it("progress clamps and handles zero duration", () => {
    expect(progress(0.5, 1, 1)).toBe(0)
    expect(progress(1.5, 1, 1)).toBe(0.5)
    expect(progress(3, 1, 1)).toBe(1)
    expect(progress(1, 1, 0)).toBe(1)
  })
  it("parses hex forms, including alpha", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255, 1])
    expect(parseColor("#00000080")[3]).toBeCloseTo(0.502, 2)
    expect(parseColor("#ff8000")).toEqual([255, 128, 0, 1])
  })
  it("interpolates colors", () => {
    expect(mixColor("#000000", "#ffffff", 0.5)).toEqual([127.5, 127.5, 127.5, 1])
    expect(mixColor("#000000", "#ffffff", 0)).toEqual([0, 0, 0, 1])
  })
  it("picks readable ink", () => {
    expect(contrastInk("#ffffff")).toBe("#0b0b0c")
    expect(contrastInk("#1d1d1f")).toBe("#ffffff")
  })
})

describe("entrancePose", () => {
  it("is invisible before it starts and at rest once settled", () => {
    for (const kind of ["none", "fade", "rise", "blur", "pop"] as const) {
      expect(entrancePose(kind, -0.01).opacity).toBe(0)
      const end = entrancePose(kind, 2)
      expect(end.opacity).toBeCloseTo(1, 5)
      expect(end.scale).toBeCloseTo(1, 3)
      expect(end.dy).toBeCloseTo(0, 3)
      expect(end.blur).toBeCloseTo(0, 5)
    }
  })
  it("blur-in starts soft and large, then sharpens", () => {
    const a = entrancePose("blur", 0.02)
    const b = entrancePose("blur", 0.3)
    expect(a.blur).toBeGreaterThan(b.blur)
    expect(a.scale).toBeGreaterThan(b.scale)
  })
})

describe("captionFrame", () => {
  it("is a pure function of time (scrub/export determinism)", () => {
    const s = style({ entrance: "pop", highlight: "color" })
    expect(captionFrame(words, lines, 1.45, s)).toEqual(captionFrame(words, lines, 1.45, s))
  })
  it("nothing on screen between lines", () => {
    expect(captionFrame(words, lines, 3.5, style())).toBeNull()
  })
  it("highlight eases in and hands over to the next word", () => {
    const s = style({ highlight: "color", entrance: "fade" })
    const at = (t: number, i: number) => captionFrame(words, lines, t, s)!.words.find((w) => w.i === i)!.active
    expect(at(1.0 - MOTION.actLead + 0.01, 0)).toBeLessThan(0.5)
    expect(at(1.3, 0)).toBeGreaterThan(0.95)
    // mid hand-over: both partially active, not snapping
    const mid = 1.4 - MOTION.actLead + 0.03
    expect(at(mid, 0)).toBeGreaterThan(0.05)
    expect(at(mid, 0)).toBeLessThan(0.95)
    expect(at(mid, 1)).toBeGreaterThan(0.05)
    expect(at(2.0, 0)).toBeCloseTo(0, 2)
  })
  it("build reveal only shows words once they start", () => {
    const f = captionFrame(words, lines, 1.45, style({ reveal: "build", entrance: "fade" }))!
    expect(f.layout).toEqual([0, 1, 2]) // stable layout
    expect(f.words.map((w) => w.i)).toEqual([0, 1])
  })
  it("single reveal shows one word", () => {
    const f = captionFrame(words, lines, 1.5, style({ reveal: "single" }))!
    expect(f.layout).toEqual([1])
  })
  it("dims upcoming words on line reveal", () => {
    const f = captionFrame(words, lines, 1.2, style({ reveal: "line", entrance: "none", dim: 0.4 }))!
    const op = (i: number) => f.words.find((w) => w.i === i)!.opacity
    expect(op(0)).toBeGreaterThan(0.95)
    expect(op(2)).toBeCloseTo(0.4, 2)
  })
  it("karaoke fill follows the word's duration", () => {
    const s = style({ highlight: "fill" })
    const fill = (t: number) => captionFrame(words, lines, t, s)!.words.find((w) => w.i === 1)!.fill
    expect(fill(1.4)).toBe(0)
    expect(fill(1.55)).toBeCloseTo(0.5, 5)
    expect(fill(1.75)).toBe(1)
  })
  it("pill slides from the previous word to the current one", () => {
    const s = style({ highlight: "pill" })
    const f = captionFrame(words, lines, 1.45, s)!
    expect(f.pill).toMatchObject({ from: 0, to: 1 })
    expect(f.pill!.q).toBeGreaterThan(0)
    expect(f.pill!.q).toBeLessThan(1)
  })
  it("fades out before an empty gap", () => {
    const f = captionFrame(words, lines, 2.2 + 0.4 - 0.05, style({ entrance: "none" }))!
    expect(f.words[0].opacity).toBeLessThan(0.5)
  })
})

describe("presets & migration", () => {
  it("has unique ids and resolves legacy ids", () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    expect(presetById("pop")?.id).toBe("creator")
    expect(presetById("clean")?.id).toBe("editorial")
    expect(presetById("karaoke")?.id).toBe("karaoke")
  })
  it("migrates a v1 style", () => {
    const v1 = {
      font: "bebas",
      size: 11,
      color: "#ffffff",
      activeColor: "#ffffff",
      stroke: 8,
      strokeColor: "#000000",
      shadow: true,
      box: false,
      boxColor: "#000000b3",
      position: 40,
      wordsPerLine: 3,
      uppercase: true,
      animation: "single",
    }
    const s = migrateStyle(v1)
    expect(s).toMatchObject({ font: "bebas", weight: 400, textCase: "upper", shadow: 0.7, background: "none", reveal: "single", size: 11 })
    expect(s).not.toHaveProperty("animation")
    expect(Object.keys(s).sort()).toEqual(Object.keys(DEFAULT_STYLE).sort())
  })
  it("rejects junk values field by field", () => {
    const s = migrateStyle({ font: "comic-sans", reveal: "sideways", size: "big", emphasis: Infinity })
    expect(s.font).toBe(DEFAULT_STYLE.font)
    expect(s.reveal).toBe(DEFAULT_STYLE.reveal)
    expect(s.size).toBe(DEFAULT_STYLE.size)
    expect(s.emphasis).toBe(DEFAULT_STYLE.emphasis)
    expect(migrateStyle(null)).toEqual(DEFAULT_STYLE)
  })
  it("keeps current styles untouched", () => {
    for (const p of PRESETS) expect(migrateStyle(p.style)).toEqual(p.style)
  })
})
