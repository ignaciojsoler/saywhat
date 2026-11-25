import type { CaptionStyle } from "./types"

export type Preset = { id: string; name: string; style: CaptionStyle }

const base: CaptionStyle = {
  font: "montserrat",
  size: 6,
  color: "#ffffff",
  activeColor: "#ffe14d",
  stroke: 12,
  strokeColor: "#000000",
  shadow: true,
  box: false,
  boxColor: "#000000b3",
  position: 18,
  wordsPerLine: 3,
  uppercase: true,
  animation: "pop",
}

export const PRESETS: Preset[] = [
  { id: "pop", name: "Pop", style: base },
  {
    id: "karaoke",
    name: "Karaoke",
    style: { ...base, animation: "karaoke", uppercase: false, activeColor: "#4ade80", wordsPerLine: 4, size: 5.5 },
  },
  {
    id: "punch",
    name: "Punch",
    style: { ...base, font: "bebas", animation: "single", size: 11, stroke: 8, position: 40, activeColor: "#ffffff" },
  },
  {
    id: "boxed",
    name: "Boxed",
    style: { ...base, font: "poppins", box: true, stroke: 0, shadow: false, animation: "karaoke", activeColor: "#ff5c8a", uppercase: false, size: 5 },
  },
  {
    id: "clean",
    name: "Clean",
    style: { ...base, font: "inter", animation: "classic", uppercase: false, stroke: 0, shadow: true, size: 4.5, wordsPerLine: 6, position: 10 },
  },
]

export const DEFAULT_STYLE = PRESETS[0].style
