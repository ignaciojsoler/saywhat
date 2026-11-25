import { captionFrame, type Pose, type WordFrame } from "./animate"
import { contrastInk, mixColor, parseColor, rgba } from "./motion"
import { FONTS, fontString, type CaptionStyle, type Line, type Word } from "./types"

/**
 * Canvas caption renderer. It is used for BOTH the live preview (a canvas laid over the
 * video) and the burned-in export, so what you see is exactly what you get.
 *
 * Only primitives that behave the same in every browser are used: shadows (also used for
 * blur, via an offset shadow), gradients, transforms and downscale/upscale for the glass.
 * No ctx.filter, which Safari lacks.
 */

export type DrawOptions = {
  /** Draws the video frame underneath at w×h. Enables the real backdrop blur of the glass panel. */
  backdrop?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

/** Every font a style needs, as canvas font strings, for document.fonts.load(). */
export const fontsFor = (style: CaptionStyle) => [fontString(style, 48)]

export const caseText = (text: string, style: Pick<CaptionStyle, "textCase">) =>
  style.textCase === "upper" ? text.toLocaleUpperCase() : style.textCase === "lower" ? text.toLocaleLowerCase() : text

type Box = { x: number; w: number; row: number; base: number }

/** shadow-trick offset: the glyph is drawn off-canvas and only its blurred shadow lands in place */
const OFF = 20000
/** max wrap width, fraction of the frame width */
const MAX_W = 0.86

function setFont(ctx: CanvasRenderingContext2D, style: CaptionStyle, px: number) {
  ctx.font = fontString(style, px)
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "left"
  if ("fontKerning" in ctx) ctx.fontKerning = "normal"
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(style.tracking * px).toFixed(2)}px`
}

/** Row metrics, relative to the font size. Serifs sit tighter. */
const lineHeight = (style: CaptionStyle) => (FONTS[style.font].family === "Instrument Serif" ? 1.08 : 1.16)

/**
 * Lay out the line's words in centered rows that fit the frame. The layout includes every
 * word of the line (even the ones not on screen yet) so words never shift as they appear.
 */
function layout(ctx: CanvasRenderingContext2D, words: Word[], idx: number[], style: CaptionStyle, W: number, H: number, px: number) {
  const tracking = style.tracking * px
  const panelPad = style.background !== "none" ? px * 0.9 : 0
  const maxW = W * MAX_W - panelPad
  const gap = ctx.measureText(" ").width + (style.highlight === "pill" ? px * 0.14 : 0)

  const measured = idx.map((i) => ({ i, w: Math.max(0, ctx.measureText(caseText(words[i].w, style)).width - tracking) }))
  const rows: { i: number; w: number }[][] = [[]]
  let rowW = 0
  for (const m of measured) {
    const row = rows[rows.length - 1]
    if (row.length && rowW + gap + m.w > maxW) {
      rows.push([m])
      rowW = m.w
    } else {
      rowW += (row.length ? gap : 0) + m.w
      row.push(m)
    }
  }

  const lh = px * lineHeight(style)
  const bottom = H * (1 - style.position / 100)
  const top = bottom - lh * rows.length
  const boxes = new Map<number, Box>()
  let minX = W
  let maxX = 0
  rows.forEach((row, r) => {
    const total = row.reduce((a, c) => a + c.w, 0) + gap * (row.length - 1)
    let x = (W - total) / 2
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x + total)
    // baseline so the caps/x-height sit optically centered in the row
    const base = top + lh * r + lh / 2 + px * 0.34
    for (const { i, w } of row) {
      boxes.set(i, { x, w, row: r, base })
      x += w + gap
    }
  })
  return { boxes, rows: rows.length, top, bottom, minX, maxX, lh }
}

/**
 * Rows wrap between words, but a single long word (e.g. "WORD-BY-WORD" in caps) can still be
 * wider than the frame. Shrink the font just enough for the widest word, at its emphasized
 * size, to fit; ordinary lines keep the preset size.
 */
function fitSize(ctx: CanvasRenderingContext2D, words: Word[], idx: number[], style: CaptionStyle, W: number, px: number) {
  setFont(ctx, style, px)
  const tracking = style.tracking * px
  const panelPad = style.background !== "none" ? px * 0.9 : 0
  const maxW = W * MAX_W - panelPad
  const widest = Math.max(0, ...idx.map((i) => ctx.measureText(caseText(words[i].w, style)).width - tracking))
  const need = widest * Math.max(1, style.emphasis)
  return need > maxW ? px * (maxW / need) : px
}

// ---------- glass ----------

let pool: HTMLCanvasElement[] = []
function scratch(n: number, w: number, h: number) {
  if (!pool.length) pool = [0, 1, 2].map(() => document.createElement("canvas"))
  const c = pool[n]
  if (c.width !== w) c.width = w
  if (c.height !== h) c.height = h
  return c.getContext("2d")!
}

/**
 * Frosted backdrop: draw the frame small, smaller, then back up in two steps.
 * Bilinear filtering at each step makes a smooth, wide blur for a fraction of the cost of a
 * real Gaussian, and it renders the same everywhere.
 */
function drawFrosted(ctx: CanvasRenderingContext2D, W: number, H: number, backdrop: NonNullable<DrawOptions["backdrop"]>) {
  const aw = Math.max(2, Math.round(W / 6))
  const ah = Math.max(2, Math.round(H / 6))
  const bw = Math.max(2, Math.round(W / 26))
  const bh = Math.max(2, Math.round(H / 26))
  const a = scratch(0, aw, ah)
  backdrop(a, aw, ah)
  const b = scratch(1, bw, bh)
  b.imageSmoothingEnabled = true
  b.drawImage(a.canvas, 0, 0, bw, bh)
  const c = scratch(2, aw, ah)
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = "high"
  c.drawImage(b.canvas, 0, 0, aw, ah)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(c.canvas, 0, 0, W, H)
}

function panelPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2))
}

// ---------- words ----------

type Paint = {
  text: string
  w: number
  px: number
  color: string
  glow: number
}

function dropShadow(ctx: CanvasRenderingContext2D, style: CaptionStyle, px: number, scale: number) {
  ctx.shadowColor = `rgba(0,0,0,${(0.55 * style.shadow).toFixed(3)})`
  ctx.shadowBlur = px * 0.3 * scale
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = px * 0.06 * scale
}

function noShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

/** Draw one word in local coordinates: origin at the word's optical center, already scaled. */
function paintWord(ctx: CanvasRenderingContext2D, style: CaptionStyle, wf: WordFrame | (Pose & { ghost: true }), p: Paint, fillAmount: number, scale: number) {
  const x0 = -p.w / 2
  const y0 = p.px * 0.34
  const strokeW = (p.px * style.stroke) / 100
  const blurPx = wf.blur * p.px * scale

  if ("ghost" in wf) {
    noShadow(ctx)
    ctx.fillStyle = p.color
    ctx.fillText(p.text, x0, y0)
    return
  }

  // blurred (entering / leaving): render through an offset shadow, which blurs identically everywhere
  if (blurPx > 0.35) {
    ctx.shadowBlur = blurPx * 2
    ctx.shadowOffsetX = OFF
    ctx.shadowOffsetY = 0
    if (strokeW > 0) {
      ctx.shadowColor = style.strokeColor
      ctx.lineWidth = strokeW * 2
      ctx.lineJoin = "round"
      ctx.strokeStyle = "#000"
      ctx.strokeText(p.text, x0 - OFF / scale, y0)
    }
    ctx.shadowColor = p.color
    ctx.fillStyle = "#000"
    if (style.highlight === "fill") ctx.globalAlpha *= style.dim
    ctx.fillText(p.text, x0 - OFF / scale, y0)
    noShadow(ctx)
    return
  }

  // glow: a wide soft halo plus a tight bright one, then the crisp core on top
  if (p.glow > 0.01) {
    const g = parseColor(style.activeColor)
    ctx.fillStyle = p.color
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.shadowColor = rgba(g, 0.85 * p.glow)
    ctx.shadowBlur = p.px * 0.6 * scale
    ctx.fillText(p.text, x0, y0)
    ctx.shadowColor = rgba(g, p.glow)
    ctx.shadowBlur = p.px * 0.16 * scale
    ctx.fillText(p.text, x0, y0)
    noShadow(ctx)
  }

  if (strokeW > 0) {
    if (style.shadow > 0) dropShadow(ctx, style, p.px, scale)
    ctx.lineWidth = strokeW * 2 // centered on the glyph edge: x2 so the visible part sits outside
    ctx.lineJoin = "round"
    ctx.miterLimit = 2
    ctx.strokeStyle = style.strokeColor
    ctx.strokeText(p.text, x0, y0)
    noShadow(ctx)
  } else if (style.shadow > 0 && p.glow <= 0.01) dropShadow(ctx, style, p.px, scale)

  ctx.fillStyle = p.color
  if (style.highlight === "fill") {
    // the unsung part sits dimmed underneath the sweep
    const prev = ctx.globalAlpha
    ctx.globalAlpha = prev * style.dim
    ctx.fillText(p.text, x0, y0)
    ctx.globalAlpha = prev
  } else ctx.fillText(p.text, x0, y0)
  noShadow(ctx)

  // karaoke sweep with a soft leading edge
  if (style.highlight === "fill" && fillAmount > 0) {
    const c = parseColor(style.activeColor)
    const feather = Math.min(0.18, (p.px * 0.35) / Math.max(1, p.w))
    const at = fillAmount * (1 + feather)
    const g = ctx.createLinearGradient(x0, 0, x0 + p.w, 0)
    g.addColorStop(0, rgba(c))
    g.addColorStop(Math.min(1, Math.max(0, at - feather)), rgba(c))
    g.addColorStop(Math.min(1, Math.max(0.0001, at)), rgba(c, 0))
    g.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = g
    ctx.fillText(p.text, x0, y0)
  }
}

/** Ghost samples for motion blur: where the word was 1 and 2 sixtieths of a second ago. */
const GHOSTS = [
  { dt: 1 / 60, alpha: 0.3 },
  { dt: 2 / 60, alpha: 0.14 },
]

/**
 * Draw the captions for time t onto a W×H canvas (device pixels).
 * Sizes are proportional to the frame height, so any resolution matches the preview.
 */
export function drawCaptions(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  words: Word[],
  lines: Line[],
  t: number,
  style: CaptionStyle,
  opts: DrawOptions = {},
) {
  const frame = captionFrame(words, lines, t, style)
  if (!frame || !frame.layout.length) return
  ctx.save()
  const px = fitSize(ctx, words, frame.layout, style, W, (style.size / 100) * H)
  setFont(ctx, style, px)
  const L = layout(ctx, words, frame.layout, style, W, H, px)

  // panel behind the block
  if (style.background !== "none" && frame.panel.opacity > 0.001) {
    const padX = px * 0.45
    const padY = px * 0.16
    const w = L.maxX - L.minX + padX * 2
    const h = L.lh * L.rows + padY * 2
    const cx = (L.minX + L.maxX) / 2
    const cy = (L.top + L.bottom) / 2
    const r = L.rows === 1 ? h / 2 : px * 0.5
    ctx.save()
    ctx.globalAlpha = frame.panel.opacity
    ctx.translate(cx, cy)
    ctx.scale(frame.panel.scale, frame.panel.scale)
    ctx.translate(-cx, -cy)
    const x = cx - w / 2
    const y = cy - h / 2
    if (style.background === "glass") {
      // soft lift under the pane
      panelPath(ctx, x, y, w, h, r)
      ctx.shadowColor = "rgba(0,0,0,0.28)"
      ctx.shadowBlur = px * 0.7
      ctx.shadowOffsetY = px * 0.12
      ctx.fillStyle = "rgba(0,0,0,0.01)"
      ctx.fill()
      noShadow(ctx)
      if (opts.backdrop) {
        ctx.save()
        panelPath(ctx, x, y, w, h, r)
        ctx.clip()
        drawFrosted(ctx, W, H, opts.backdrop)
        ctx.restore()
      }
      // tint; denser when there's nothing to frost (thumbnails)
      panelPath(ctx, x, y, w, h, r)
      ctx.fillStyle = rgba(parseColor(style.boxColor), opts.backdrop ? 1 : 1.8)
      ctx.fill()
      // top-lit hairline
      const edge = ctx.createLinearGradient(0, y, 0, y + h)
      edge.addColorStop(0, "rgba(255,255,255,0.28)")
      edge.addColorStop(0.5, "rgba(255,255,255,0.06)")
      edge.addColorStop(1, "rgba(255,255,255,0.12)")
      ctx.strokeStyle = edge
      ctx.lineWidth = Math.max(1, px * 0.025)
      panelPath(ctx, x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth, r)
      ctx.stroke()
    } else {
      panelPath(ctx, x, y, w, h, r)
      ctx.fillStyle = style.boxColor
      ctx.fill()
    }
    ctx.restore()
  }

  // sliding pill behind the active word
  if (frame.pill) {
    const to = L.boxes.get(frame.pill.to)
    const toWord = frame.words.find((w) => w.i === frame.pill!.to)
    if (to && toWord) {
      const from = frame.pill.from >= 0 ? L.boxes.get(frame.pill.from) : undefined
      const q = frame.pill.q
      const padX = px * 0.2
      const h = px * 1.1
      let x = to.x - padX
      let w = to.w + padX * 2
      const cy = to.base - px * 0.34
      let alpha = toWord.opacity
      let s = 1
      if (from && from.row === to.row) {
        x = from.x - padX + (x - (from.x - padX)) * q
        w = from.w + padX * 2 + (w - (from.w + padX * 2)) * q
      } else {
        alpha *= q
        s = 0.86 + 0.14 * q
      }
      ctx.save()
      ctx.globalAlpha = Math.min(1, alpha)
      ctx.translate(x + w / 2, cy)
      ctx.scale(s * toWord.emphasis, s * toWord.emphasis)
      panelPath(ctx, -w / 2, -h / 2, w, h, h / 2)
      if (style.shadow > 0) {
        ctx.shadowColor = `rgba(0,0,0,${(0.3 * style.shadow).toFixed(3)})`
        ctx.shadowBlur = px * 0.3
        ctx.shadowOffsetY = px * 0.05
      }
      ctx.fillStyle = style.activeColor
      ctx.fill()
      ctx.restore()
    }
  }

  const ink = style.highlight === "pill" ? contrastInk(style.activeColor) : style.activeColor
  const motionBlur = style.entrance === "rise" || style.entrance === "pop"
  const ghostFrames = motionBlur ? GHOSTS.map((g) => ({ ...g, frame: captionFrame(words, lines, t - g.dt, style) })) : []

  for (const wf of frame.words) {
    const box = L.boxes.get(wf.i)
    if (!box) continue
    const text = caseText(words[wf.i].w, style)
    const active = style.highlight === "color" || style.highlight === "pill" ? wf.active : 0
    const color = active > 0 ? rgba(mixColor(style.color, ink, active)) : style.color
    const glow = style.glow * (style.highlight === "none" ? 1 : 0.4 + 0.6 * wf.active)
    const paint: Paint = { text, w: box.w, px, color, glow }
    const cx = box.x + box.w / 2
    const cy = box.base - px * 0.34

    // motion blur: trailing copies where the word just was, only while it moves fast
    for (const g of ghostFrames) {
      const past = g.frame?.words.find((w) => w.i === wf.i)
      if (!past) continue
      const moved = Math.abs(past.dy - wf.dy) * px + Math.abs(past.scale - wf.scale) * box.w * 0.5
      if (moved < 1.5) continue
      ctx.save()
      ctx.globalAlpha = Math.min(wf.opacity, past.opacity) * g.alpha
      ctx.translate(cx, cy + past.dy * px)
      ctx.scale(past.scale, past.scale)
      paintWord(ctx, style, { ...past, ghost: true }, paint, 0, past.scale)
      ctx.restore()
    }

    ctx.save()
    ctx.globalAlpha = Math.min(1, wf.opacity)
    ctx.translate(cx, cy + wf.dy * px)
    ctx.scale(wf.scale, wf.scale)
    paintWord(ctx, style, wf, paint, wf.fill, wf.scale)
    ctx.restore()
  }
  ctx.restore()
}

/** "cover" placement of a source inside a W×H frame; `posX` = horizontal focus (0–1), like object-position. */
export function coverRect(sw: number, sh: number, W: number, H: number, posX = 0.5, posY = 0.5) {
  const scale = Math.max(W / sw, H / sh)
  const dw = sw * scale
  const dh = sh * scale
  return { dx: (W - dw) * posX, dy: (H - dh) * posY, dw, dh }
}
