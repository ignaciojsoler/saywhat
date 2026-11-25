import { clamp01, ease, lerp, progress, spring } from "./motion"
import { activeLineAt, activeWordAt, HOLD, LEAD } from "./timing"
import type { CaptionStyle, Entrance, Line, Word } from "./types"

/**
 * Caption animation state for one instant of the video.
 *
 * This is the single source of truth for motion: the preview and the export both call
 * `captionFrame(t)` and draw the result with the same canvas renderer, so they cannot drift
 * apart. It only depends on the video time `t`, never on wall-clock time.
 */

export const MOTION = {
  /** stagger between words when a whole line enters at once (s) */
  stagger: 0.035,
  /** highlight transitions start this much before the word is heard (s) */
  actLead: 0.03,
  /** duration of highlight transitions: color, pill slide, emphasis (s) */
  actDur: 0.28,
  /** time for a word to go from dimmed to fully lit (s) */
  spokenDur: 0.24,
  /** line exit fade, when nothing follows it right away (s) */
  exit: 0.2,
  /** panel (box / glass) entrance (s) */
  panelDur: 0.42,
} as const

export type Pose = { opacity: number; scale: number; dy: number; blur: number }

const REST: Pose = { opacity: 1, scale: 1, dy: 0, blur: 0 }

/**
 * Entrance pose `dt` seconds after the entrance starts. `dy` and `blur` are in em
 * (multiples of the font size) so they scale with the caption.
 */
export function entrancePose(kind: Entrance, dt: number): Pose {
  if (dt < 0) return { opacity: 0, scale: 1, dy: 0, blur: 0 }
  switch (kind) {
    case "none":
      return { ...REST, opacity: progress(dt, 0, 0.06) }
    case "fade":
      return { ...REST, opacity: ease.outQuint(progress(dt, 0, 0.32)) }
    case "rise": {
      const e = ease.outExpo(progress(dt, 0, 0.55))
      return {
        opacity: ease.outQuint(progress(dt, 0, 0.24)),
        scale: 1,
        dy: (1 - e) * 0.42,
        blur: (1 - ease.outQuint(progress(dt, 0, 0.26))) * 0.05,
      }
    }
    case "blur": {
      const e = ease.outExpo(progress(dt, 0, 0.65))
      return {
        opacity: ease.outQuint(progress(dt, 0, 0.34)),
        scale: 1 + (1 - e) * 0.1,
        dy: (1 - e) * 0.1,
        blur: (1 - ease.outQuint(progress(dt, 0, 0.46))) * 0.2,
      }
    }
    case "pop": {
      // slightly under-damped: ~6% overshoot, settled in ~0.35 s
      const s = spring(dt, 19, 0.58)
      return { opacity: ease.outQuint(progress(dt, 0, 0.1)), scale: 0.6 + 0.4 * s, dy: (1 - s) * 0.14, blur: 0 }
    }
  }
}

export type WordFrame = Pose & {
  /** index into the words array */
  i: number
  /** highlight amount, 0–1 (eases in when the word starts, out when the next one does) */
  active: number
  /** extra scale on the active word, already folded into `scale` */
  emphasis: number
  /** 0–1: how far the word has turned from "upcoming" to "spoken" */
  spoken: number
  /** karaoke fill, 0–1 across the word's duration */
  fill: number
}

export type CaptionFrame = {
  /** index of the line on screen */
  line: number
  /** words that take space in the layout (stable while the line is on screen) */
  layout: number[]
  /** words to draw, with their animated pose */
  words: WordFrame[]
  /** panel behind the block (box / glass) */
  panel: { opacity: number; scale: number }
  /** sliding highlight pill: from word → to word, `q` = slide progress */
  pill: { from: number; to: number; q: number } | null
}

/** Highlight amount of word i: eases in at its start, out when the next word in the line starts. */
function activeAmount(words: Word[], line: Line, i: number, t: number) {
  const rise = ease.outExpo(progress(t, words[i].s - MOTION.actLead, MOTION.actDur))
  if (rise === 0) return 0
  const next = i + 1 < line[1] ? words[i + 1].s : Infinity
  const fall = ease.outExpo(progress(t, next - MOTION.actLead, MOTION.actDur))
  return rise * (1 - fall)
}

export function captionFrame(words: Word[], lines: Line[], t: number, style: CaptionStyle): CaptionFrame | null {
  const k = activeLineAt(words, lines, t)
  if (k < 0) return null
  const line = lines[k]
  const [a, b] = line
  const show = words[a].s - LEAD
  const end = words[b - 1].e + HOLD
  const nextShow = k + 1 < lines.length ? words[lines[k + 1][0]].s - LEAD : Infinity

  // fade out only when the screen would otherwise go empty; back-to-back lines cut cleanly
  const x = nextShow >= end ? progress(t, end - MOTION.exit, MOTION.exit) : 0
  const exitOpacity = 1 - ease.inOut(x)
  const exitBlur = style.entrance === "blur" ? x * 0.08 : 0

  let layout: number[]
  if (style.reveal === "single") {
    const on = activeWordAt(words, line, t + LEAD)
    layout = on >= 0 ? [on] : []
  } else layout = Array.from({ length: b - a }, (_, j) => a + j)

  const out: WordFrame[] = []
  for (const i of layout) {
    const s = words[i].s
    const start =
      style.reveal === "line" ? show + (i - a) * MOTION.stagger : style.reveal === "build" ? Math.max(show, s - LEAD) : s - LEAD
    const pose = entrancePose(style.entrance, t - start)
    if (pose.opacity <= 0.001) continue

    const active = style.reveal === "single" ? 1 : activeAmount(words, line, i, t)
    // on "pop" the emphasis springs too; elsewhere it follows the eased highlight
    let emph = active
    if (style.entrance === "pop" && style.reveal !== "single") {
      const next = i + 1 < b ? words[i + 1].s : Infinity
      const fall = ease.outExpo(progress(t, next - MOTION.actLead, MOTION.actDur))
      emph = spring(t - (s - MOTION.actLead), 24, 0.5) * (1 - fall)
    }
    const emphasis = 1 + (style.emphasis - 1) * emph
    const spoken = ease.outQuint(progress(t, s - MOTION.actLead, MOTION.spokenDur))
    const fill = clamp01((t - s) / Math.max(0.12, words[i].e - s))

    let opacity = pose.opacity * exitOpacity
    if (style.reveal === "line" && style.highlight !== "fill") opacity *= lerp(style.dim, 1, spoken)

    out.push({
      i,
      opacity,
      scale: pose.scale * emphasis,
      dy: pose.dy,
      blur: pose.blur + exitBlur,
      active,
      emphasis,
      spoken,
      fill,
    })
  }

  let pill: CaptionFrame["pill"] = null
  if (style.highlight === "pill" && style.reveal !== "single") {
    const on = activeWordAt(words, line, t + MOTION.actLead)
    if (on >= 0) {
      const q = ease.outExpo(progress(t, words[on].s - MOTION.actLead, MOTION.actDur))
      pill = { from: on > a ? on - 1 : -1, to: on, q }
    }
  } else if (style.highlight === "pill" && layout.length) pill = { from: -1, to: layout[0], q: 1 }

  return {
    line: k,
    layout,
    words: out,
    panel: {
      opacity: ease.outQuint(progress(t, show, MOTION.panelDur * 0.7)) * exitOpacity,
      scale: 0.94 + 0.06 * ease.outExpo(progress(t, show, MOTION.panelDur)),
    },
    pill,
  }
}
