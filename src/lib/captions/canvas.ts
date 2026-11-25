import { activeLineAt, activeWordAt } from "./timing"
import { FONTS, type CaptionStyle, type Line, type Word } from "./types"

/** Resolved font family for canvas, which can't read CSS var(). */
export function resolveFont(style: CaptionStyle): string {
  const varName = FONTS[style.font].css.slice(4, -1) // "var(--x)" → "--x"
  const fam = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return `${FONTS[style.font].weight} {px}px ${fam || "sans-serif"}`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

/**
 * Draw the captions for time t onto a W×H canvas.
 * Mirrors the DOM preview: same proportions relative to frame height.
 */
export function drawCaptions(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  words: Word[],
  lines: Line[],
  t: number,
  style: CaptionStyle,
  fontTemplate: string,
) {
  const k = activeLineAt(words, lines, t)
  if (k < 0) return
  const line = lines[k]
  const on = activeWordAt(words, line, t)
  let idx = Array.from({ length: line[1] - line[0] }, (_, j) => line[0] + j)
  if (style.animation === "single") idx = on >= 0 ? [on] : []
  if (!idx.length) return

  const px = (style.size / 100) * H
  ctx.font = fontTemplate.replace("{px}", String(Math.round(px)))
  ctx.textBaseline = "alphabetic"
  const label = (i: number) => (style.uppercase ? words[i].w.toUpperCase() : words[i].w)
  const space = ctx.measureText(" ").width
  const maxW = W * 0.88

  // wrap words into rows that fit the width
  const rows: { i: number; w: number }[][] = [[]]
  let rowW = 0
  for (const i of idx) {
    const w = ctx.measureText(label(i)).width
    const row = rows[rows.length - 1]
    if (row.length && rowW + space + w > maxW) {
      rows.push([{ i, w }])
      rowW = w
    } else {
      rowW += (row.length ? space : 0) + w
      row.push({ i, w })
    }
  }

  const lineH = px * 1.2
  const bottom = H * (1 - style.position / 100)
  const top = bottom - lineH * rows.length

  rows.forEach((row, r) => {
    const total = row.reduce((a, c) => a + c.w, 0) + space * (row.length - 1)
    let x = (W - total) / 2
    const y = top + lineH * (r + 1) - px * 0.22

    if (style.box) {
      ctx.fillStyle = style.boxColor
      roundRect(ctx, x - px * 0.35, y - px * 0.95, total + px * 0.7, px * 1.25, px * 0.2)
    }

    for (const { i, w } of row) {
      const active = i === on
      let fill = style.color
      let alpha = 1
      if (style.animation === "karaoke" || style.animation === "pop") {
        if (active) fill = style.activeColor
        else if (style.animation === "karaoke" && i > on) alpha = 0.55
      }
      const scale = style.animation === "pop" && active ? 1.1 : 1

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x + w / 2, y - px * 0.35)
      ctx.scale(scale, scale)
      ctx.translate(-(x + w / 2), -(y - px * 0.35))
      if (style.stroke > 0) {
        ctx.lineJoin = "round"
        ctx.lineWidth = (px * style.stroke) / 100 * 2 // strokes are centered on the glyph edge: x2 so the visible part sits outside
        ctx.strokeStyle = style.strokeColor
        ctx.strokeText(label(i), x, y)
      }
      if (style.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.6)"
        ctx.shadowBlur = px * 0.18
        ctx.shadowOffsetY = px * 0.06
      }
      ctx.fillStyle = fill
      ctx.fillText(label(i), x, y)
      ctx.restore()
      x += w + space
    }
  })
}
