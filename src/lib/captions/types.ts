/** A transcribed word with its timing in seconds. */
export type Word = { w: string; s: number; e: number }

/** A caption line as a range into the words array: [start, end) */
export type Line = [start: number, end: number]

export type Animation = "karaoke" | "pop" | "single" | "classic"
export type Aspect = "original" | "9:16" | "1:1" | "16:9"

/**
 * Caption style. Sizes are relative to the frame height (in %), so the preview
 * and the exported video look identical at any resolution.
 */
export type CaptionStyle = {
  font: FontId
  /** Font size, % of frame height */
  size: number
  color: string
  activeColor: string
  /** Outline width, % of font size */
  stroke: number
  strokeColor: string
  shadow: boolean
  /** Background box behind each line */
  box: boolean
  boxColor: string
  /** Distance from the bottom edge, % of frame height */
  position: number
  wordsPerLine: number
  uppercase: boolean
  animation: Animation
}

export const FONTS = {
  montserrat: { label: "Montserrat", css: "var(--font-montserrat)", weight: 900 },
  bebas: { label: "Bebas Neue", css: "var(--font-bebas)", weight: 400 },
  poppins: { label: "Poppins", css: "var(--font-poppins)", weight: 800 },
  inter: { label: "Inter", css: "var(--font-inter)", weight: 700 },
} as const

export type FontId = keyof typeof FONTS
