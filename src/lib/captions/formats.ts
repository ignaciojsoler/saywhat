import type { Line, Word } from "./types"

const pad = (n: number, l = 2) => String(n).padStart(l, "0")

function stamp(t: number, sep: "," | ".") {
  const ms = Math.max(0, Math.round(t * 1000))
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${sep}${pad(ms % 1000, 3)}`
}

const text = (words: Word[], [a, b]: Line) => words.slice(a, b).map((w) => w.w).join(" ")

export function toSRT(words: Word[], lines: Line[]): string {
  return lines
    .map((l, k) => `${k + 1}\n${stamp(words[l[0]].s, ",")} --> ${stamp(words[l[1] - 1].e, ",")}\n${text(words, l)}\n`)
    .join("\n")
}

export function toVTT(words: Word[], lines: Line[]): string {
  return (
    "WEBVTT\n\n" +
    lines.map((l) => `${stamp(words[l[0]].s, ".")} --> ${stamp(words[l[1] - 1].e, ".")}\n${text(words, l)}\n`).join("\n")
  )
}

/** "1:05.3" for the UI */
export const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`
