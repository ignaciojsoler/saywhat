import { FONTS, type CaptionStyle, type FontId } from "./types"

export type Preset = {
  id: string
  name: string
  /** one-line personality, shown in the style picker */
  tagline: string
  style: CaptionStyle
}

/**
 * Curated presets. Restraint is the point: one accent color at most, soft shadows instead of
 * heavy outlines (except where the outline IS the look), tight tracking on display sizes,
 * and motion that eases instead of snapping.
 */
const base: CaptionStyle = {
  font: "inter-tight",
  weight: 600,
  size: 4.8,
  tracking: -0.02,
  textCase: "none",
  color: "#ffffff",
  activeColor: "#ffffff",
  stroke: 0,
  strokeColor: "#000000",
  shadow: 0.7,
  glow: 0,
  background: "none",
  boxColor: "#00000099",
  position: 16,
  wordsPerLine: 4,
  reveal: "line",
  entrance: "rise",
  highlight: "none",
  emphasis: 1,
  dim: 1,
}

export const PRESETS: Preset[] = [
  {
    id: "creator",
    name: "Creator",
    tagline: "Heavy caps, warm yellow on the beat",
    style: {
      ...base,
      font: "montserrat",
      weight: 900,
      size: 6.2,
      tracking: -0.01,
      textCase: "upper",
      activeColor: "#ffd43b",
      stroke: 8,
      strokeColor: "#0a0a0a",
      shadow: 0.8,
      position: 20,
      wordsPerLine: 3,
      entrance: "pop",
      highlight: "color",
      emphasis: 1.1,
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    tagline: "Quiet sentence case that lights up as it's said",
    style: { ...base, size: 4.6, tracking: -0.025, wordsPerLine: 5, entrance: "blur", dim: 0.38, position: 14 },
  },
  {
    id: "frost",
    name: "Frost",
    tagline: "Frosted glass, a soft pill glides word to word",
    style: {
      ...base,
      size: 4.3,
      tracking: -0.015,
      background: "glass",
      boxColor: "#14141452",
      highlight: "pill",
      activeColor: "#ffffff",
      shadow: 0.5,
      wordsPerLine: 4,
      entrance: "rise",
    },
  },
  {
    id: "karaoke",
    name: "Karaoke",
    tagline: "Each word fills in as it's sung",
    style: {
      ...base,
      font: "bricolage",
      weight: 800,
      size: 5.4,
      tracking: -0.03,
      activeColor: "#9dfc6b",
      dim: 0.5,
      highlight: "fill",
      entrance: "rise",
      wordsPerLine: 4,
      position: 18,
    },
  },
  {
    id: "cinema",
    name: "Cinema",
    tagline: "Ivory serif italics, words breathe in from a blur",
    style: {
      ...base,
      font: "instrument-italic",
      weight: 400,
      size: 6.4,
      tracking: -0.01,
      color: "#f6efe3",
      activeColor: "#f6efe3",
      shadow: 0.6,
      reveal: "build",
      entrance: "blur",
      wordsPerLine: 4,
      position: 15,
    },
  },
  {
    id: "afterglow",
    name: "Afterglow",
    tagline: "Neon done gently: a cool glow on the word being said",
    style: {
      ...base,
      font: "bricolage",
      weight: 700,
      size: 5,
      tracking: 0.01,
      textCase: "upper",
      color: "#f2f8ff",
      activeColor: "#62d9ff",
      glow: 0.75,
      shadow: 0,
      highlight: "color",
      emphasis: 1.04,
      entrance: "fade",
      dim: 0.55,
      wordsPerLine: 3,
      position: 18,
    },
  },
  {
    id: "whisper",
    name: "Whisper",
    tagline: "Small, lowercase, unhurried",
    style: {
      ...base,
      weight: 500,
      size: 3.7,
      tracking: -0.01,
      textCase: "lower",
      color: "#ffffffee",
      shadow: 0.75,
      reveal: "build",
      entrance: "fade",
      wordsPerLine: 6,
      position: 10,
    },
  },
  {
    id: "punch",
    name: "Punch",
    tagline: "One word at a time, big and springy",
    style: {
      ...base,
      font: "bricolage",
      weight: 800,
      size: 10,
      tracking: -0.035,
      textCase: "upper",
      shadow: 0.8,
      reveal: "single",
      entrance: "pop",
      wordsPerLine: 3,
      position: 30,
    },
  },
]

export const DEFAULT_STYLE = PRESETS[0].style

/** Old preset ids (before the redesign) → their closest current preset. */
const LEGACY_IDS: Record<string, string> = { pop: "creator", boxed: "frost", clean: "editorial" }

export function presetById(id: string): Preset | undefined {
  const key = LEGACY_IDS[id] ?? id
  return PRESETS.find((p) => p.id === key)
}

const sameStyle = (a: CaptionStyle, b: CaptionStyle) =>
  (Object.keys(a) as (keyof CaptionStyle)[]).every((k) => a[k] === b[k])

/** The preset a style comes from, if it hasn't been customized. */
export const matchPreset = (style: CaptionStyle) => PRESETS.find((p) => sameStyle(p.style, style))

// ---------- migration of styles saved by older versions ----------

type LegacyStyle = {
  font?: string
  uppercase?: boolean
  shadow?: boolean | number
  box?: boolean
  animation?: "karaoke" | "pop" | "single" | "classic"
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)

/**
 * Bring a stored style (localStorage or the database) to the current shape. Styles from the
 * first version (animation / uppercase / box / boolean shadow) are translated to the closest
 * look; missing fields come from the default preset. Unknown input returns the default.
 */
export function migrateStyle(raw: unknown): CaptionStyle {
  if (!isObj(raw)) return DEFAULT_STYLE
  const old = raw as LegacyStyle & Partial<CaptionStyle>
  const out: Record<string, unknown> = { ...DEFAULT_STYLE, ...raw }

  if (typeof old.font !== "string" || !(old.font in FONTS)) out.font = DEFAULT_STYLE.font
  if (typeof raw.weight !== "number") {
    const f = FONTS[out.font as FontId]
    out.weight = f.weights[f.weights.length - 1]
  }
  if (typeof old.uppercase === "boolean" && raw.textCase === undefined) out.textCase = old.uppercase ? "upper" : "none"
  if (typeof old.shadow === "boolean") out.shadow = old.shadow ? 0.7 : 0
  if (typeof old.box === "boolean" && raw.background === undefined) out.background = old.box ? "box" : "none"

  if (old.animation && raw.reveal === undefined) {
    const a = old.animation
    out.reveal = a === "single" ? "single" : "line"
    out.entrance = a === "classic" ? "fade" : "pop"
    out.highlight = a === "karaoke" || a === "pop" ? "color" : "none"
    out.emphasis = a === "pop" ? 1.1 : 1
    out.dim = a === "karaoke" ? 0.55 : 1
    if (a === "karaoke") out.entrance = "rise"
  }

  // keep only known keys with the right type and an allowed value
  const clean: Record<string, unknown> = {}
  for (const k of Object.keys(DEFAULT_STYLE) as (keyof CaptionStyle)[]) {
    const v = out[k]
    const ok =
      typeof v === typeof DEFAULT_STYLE[k] &&
      (typeof v !== "number" || Number.isFinite(v)) &&
      (!(k in ENUMS) || (ENUMS[k as keyof typeof ENUMS] as readonly unknown[]).includes(v))
    clean[k] = ok ? v : DEFAULT_STYLE[k]
  }
  return clean as CaptionStyle
}

const ENUMS = {
  textCase: ["none", "upper", "lower"],
  background: ["none", "box", "glass"],
  reveal: ["line", "build", "single"],
  entrance: ["none", "fade", "rise", "blur", "pop"],
  highlight: ["none", "color", "pill", "fill"],
} as const satisfies Partial<Record<keyof CaptionStyle, readonly string[]>>
