import type { Line, Word } from "./types"

/** Pause (s) that ends a line even if it isn't full. */
const GAP_BREAK = 0.6
/** How long a line stays on screen after its last word. */
const HOLD = 0.4

/**
 * Group words into short lines, breaking on count, long pauses and sentence ends.
 * Short lines (1–3 words) read best on a phone.
 */
export function groupWords(words: Word[], perLine: number): Line[] {
  const per = Math.max(1, Math.round(perLine))
  const lines: Line[] = []
  let start = 0
  for (let i = 1; i <= words.length; i++) {
    const end = i === words.length
    const gap = end ? 0 : words[i].s - words[i - 1].e
    if (end || i - start >= per || gap > GAP_BREAK || /[.?!…]$/.test(words[i - 1].w)) {
      lines.push([start, i])
      start = i
    }
  }
  return lines
}

/** Index of the line on screen at time t, or -1. */
export function activeLineAt(words: Word[], lines: Line[], t: number): number {
  let k = -1
  // binary search on line start times
  let lo = 0
  let hi = lines.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (words[lines[mid][0]].s - 0.05 <= t) {
      k = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (k < 0) return -1
  return t <= words[lines[k][1] - 1].e + HOLD ? k : -1
}

/** Last word already spoken within the line, or -1. */
export function activeWordAt(words: Word[], line: Line, t: number): number {
  let on = -1
  for (let i = line[0]; i < line[1]; i++) if (words[i].s <= t) on = i
  return on
}

/**
 * Replace a line's text. Same word count keeps the timings;
 * a different count spreads the line's span evenly across the new words.
 */
export function replaceLineText(words: Word[], line: Line, text: string): Word[] {
  const [a, b] = line
  const toks = text.trim().split(/\s+/).filter(Boolean)
  const old = words.slice(a, b)
  let repl: Word[]
  if (toks.length === old.length) repl = old.map((w, i) => ({ ...w, w: toks[i] }))
  else {
    const s = old[0].s
    const d = (old[old.length - 1].e - s) / (toks.length || 1)
    repl = toks.map((w, i) => ({ w, s: s + i * d, e: s + (i + 1) * d }))
  }
  return [...words.slice(0, a), ...repl, ...words.slice(b)]
}
