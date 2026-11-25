/** A transcribed word with its timing in seconds. */
export type Word = { w: string; s: number; e: number }

/** A caption line as a range into the words array: [start, end) */
export type Line = [start: number, end: number]

export type Aspect = "original" | "9:16" | "1:1" | "16:9"

/**
 * How a line's words show up.
 * - line: the whole line is on screen while it is spoken (upcoming words can be dimmed)
 * - build: words appear one by one as they are spoken, on a stable layout
 * - single: one word at a time
 */
export type Reveal = "line" | "build" | "single"
/** Word entrance motion. All curves are functions of video time, never wall-clock. */
export type Entrance = "none" | "fade" | "rise" | "blur" | "pop"
/**
 * How the word being spoken stands out.
 * - color: text color eases to the highlight color
 * - pill: a rounded pill in the highlight color slides behind the active word
 * - fill: karaoke sweep, the highlight color fills each word left to right as it is said
 */
export type Highlight = "none" | "color" | "pill" | "fill"
export type Background = "none" | "box" | "glass"
export type TextCase = "none" | "upper" | "lower"

/**
 * Caption style. Sizes are relative to the frame height (in %), so the preview
 * and the exported video look identical at any resolution.
 */
export type CaptionStyle = {
  font: FontId
  /** Font weight; snapped to the nearest weight the font ships */
  weight: number
  /** Font size, % of frame height */
  size: number
  /** Letter spacing, em */
  tracking: number
  textCase: TextCase
  color: string
  activeColor: string
  /** Outline width, % of font size */
  stroke: number
  strokeColor: string
  /** Soft drop shadow strength, 0–1 */
  shadow: number
  /** Glow strength in the highlight color, 0–1 */
  glow: number
  /** Panel behind the caption block */
  background: Background
  boxColor: string
  /** Distance from the bottom edge, % of frame height */
  position: number
  wordsPerLine: number
  reveal: Reveal
  entrance: Entrance
  highlight: Highlight
  /** Scale of the active word, 1 = none */
  emphasis: number
  /** Opacity of words not spoken yet (line reveal), 1 = no dimming */
  dim: number
}

export type FontDef = {
  label: string
  /** CSS / canvas font-family name (self-hosted via @fontsource, see caption-canvas.tsx) */
  family: string
  /** weights available; variable fonts list their useful stops */
  weights: readonly number[]
  italic: boolean
  /** shown in the font picker; legacy faces stay valid for saved styles but are hidden */
  legacy?: boolean
}

export const FONTS = {
  "inter-tight": { label: "Inter Tight", family: "Inter Tight Variable", weights: [400, 500, 600, 700, 800], italic: false },
  bricolage: { label: "Bricolage Grotesque", family: "Bricolage Grotesque Variable", weights: [400, 500, 600, 700, 800], italic: false },
  "instrument-italic": { label: "Instrument Serif Italic", family: "Instrument Serif", weights: [400], italic: true },
  "instrument-serif": { label: "Instrument Serif", family: "Instrument Serif", weights: [400], italic: false },
  montserrat: { label: "Montserrat", family: "Montserrat", weights: [800, 900], italic: false },
  bebas: { label: "Bebas Neue", family: "Bebas Neue", weights: [400], italic: false, legacy: true },
  poppins: { label: "Poppins", family: "Poppins", weights: [800], italic: false, legacy: true },
  inter: { label: "Inter", family: "Inter", weights: [700], italic: false, legacy: true },
} as const satisfies Record<string, FontDef>

export type FontId = keyof typeof FONTS

/** Nearest weight the font actually ships. */
export function fontWeight(style: Pick<CaptionStyle, "font" | "weight">): number {
  const ws: readonly number[] = FONTS[style.font].weights
  return ws.reduce((best, w) => (Math.abs(w - style.weight) < Math.abs(best - style.weight) ? w : best), ws[0])
}

/** Canvas/CSS font shorthand at a given pixel size. */
export function fontString(style: Pick<CaptionStyle, "font" | "weight">, px: number): string {
  const f = FONTS[style.font]
  return `${f.italic ? "italic " : ""}${fontWeight(style)} ${px}px "${f.family}", sans-serif`
}
