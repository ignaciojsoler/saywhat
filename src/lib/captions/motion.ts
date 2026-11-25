/**
 * Pure motion primitives: easing curves, springs and color interpolation.
 * Everything here is a function of elapsed (video) time, so a given frame always
 * renders the same way: while playing, scrubbing, paused or exporting.
 */

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Progress (0–1) of an animation that starts at `start` and lasts `dur` seconds. */
export const progress = (t: number, start: number, dur: number) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp01((t - start) / dur))

/**
 * CSS-style cubic-bezier(x1, y1, x2, y2) easing.
 * Solves x(u) = x with Newton-Raphson, falling back to bisection (same approach as browsers).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx

  const solve = (x: number) => {
    let u = x
    for (let i = 0; i < 8; i++) {
      const err = sampleX(u) - x
      if (Math.abs(err) < 1e-6) return u
      const d = slopeX(u)
      if (Math.abs(d) < 1e-6) break
      u -= err / d
    }
    let lo = 0
    let hi = 1
    u = x
    for (let i = 0; i < 30; i++) {
      const v = sampleX(u)
      if (Math.abs(v - x) < 1e-6) return u
      if (v < x) lo = u
      else hi = u
      u = (lo + hi) / 2
    }
    return u
  }

  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solve(x)))
}

/** The curves the caption system uses. */
export const ease = {
  /** long, soft landing: entrances and slides (Apple-style "expo out") */
  outExpo: cubicBezier(0.16, 1, 0.3, 1),
  /** a little firmer than expo, for opacity and blur */
  outQuint: cubicBezier(0.22, 1, 0.36, 1),
  outCubic: cubicBezier(0.33, 1, 0.68, 1),
  /** symmetric, for exits and cross-fades */
  inOut: cubicBezier(0.65, 0, 0.35, 1),
} as const

/**
 * Step response of a damped spring going from 0 to 1, `t` seconds after release.
 * `omega` = natural angular frequency (rad/s), `zeta` = damping ratio (<1 overshoots).
 */
export function spring(t: number, omega: number, zeta: number): number {
  if (t <= 0) return 0
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t)
  const wd = omega * Math.sqrt(1 - zeta * zeta)
  const decay = Math.exp(-zeta * omega * t)
  return 1 - decay * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t))
}

// ---------- color ----------

export type RGBA = [r: number, g: number, b: number, a: number]

const cache = new Map<string, RGBA>()

/** "#rgb", "#rgba", "#rrggbb" or "#rrggbbaa" → [r, g, b, a] (a in 0–1). Anything else is white. */
export function parseColor(hex: string): RGBA {
  const hit = cache.get(hex)
  if (hit) return hit
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("")
  let out: RGBA = [255, 255, 255, 1]
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) {
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
    out = [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
  }
  cache.set(hex, out)
  return out
}

export const rgba = ([r, g, b, a]: RGBA, alpha = 1) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+(a * alpha).toFixed(4)})`

export function mixColor(a: string, b: string, t: number): RGBA {
  const x = parseColor(a)
  const y = parseColor(b)
  if (t <= 0) return x
  if (t >= 1) return y
  return [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t), lerp(x[3], y[3], t)]
}

/** Relative luminance (WCAG), 0–1. */
export function luminance(hex: string): number {
  const [r, g, b] = parseColor(hex).map((c, i) => {
    if (i === 3) return c
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Ink that reads on top of a given color: near-black on light colors, white on dark ones. */
export const contrastInk = (hex: string) => (luminance(hex) > 0.4 ? "#0b0b0c" : "#ffffff")
