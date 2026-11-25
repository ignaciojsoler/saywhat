// Usage: bun add opentype.js (outside the app), then: bun generate.mjs <out-dir>
// Brand SVGs. The favicon (src/app/icon.svg) is a hand-drawn 16px-grid version of the mark.
// Generates brand SVGs. Wordmark: Montserrat 900 converted to paths with opentype.js.
import opentype from "opentype.js"
import fs from "node:fs"
const REPO = new URL("../..", import.meta.url).pathname
const font = opentype.parse(fs.readFileSync(`${REPO}/node_modules/@fontsource/montserrat/files/montserrat-latin-900-normal.woff`).buffer)
const out = process.argv[2]
fs.mkdirSync(out, { recursive: true })

const YELLOW = "#FFE14D", INK = "#0A0A0A", WHITE = "#FAFAFA"
// mark in a 64x64 box: S built from two caption lines + highlighted middle word
const S_PATH = "M25 6h25a5.5 5.5 0 0 1 0 11H25a4 4 0 0 0-4 4H10A15 15 0 0 1 25 6Zm29 37a15 15 0 0 1-15 15H14a5.5 5.5 0 0 1 0-11h25a4 4 0 0 0 4-4Z"
const WORD = { x: 10, y: 25, w: 44, h: 14, r: 3.5 }
const wordRect = (fill, extra = "") => `<rect x="${WORD.x}" y="${WORD.y}" width="${WORD.w}" height="${WORD.h}" rx="${WORD.r}" fill="${fill}"${extra}/>`
const mark = (lines, word, extra = "") => `<path fill="${lines}" d="${S_PATH}"/>${wordRect(word, extra)}`

// wordmark
const fontSize = 56
const p = font.getPath("Saywhat", 0, 0, fontSize, { letterSpacing: -0.02 })
const bb = p.getBoundingBox()
const capH = font.tables.os2.sCapHeight / font.unitsPerEm * fontSize
// place: baseline so caps are vertically centred on the mark (mark spans y 6..58 -> centre 32)
const gap = 14
const tx = 64 + gap - bb.x1
const baseline = 32 + capH / 2
const wp = font.getPath("Saywhat", tx, baseline, fontSize, { letterSpacing: -0.02 })
wp.fill = null
const wordD = wp.toPathData(1)
const wordW = Math.ceil(64 + gap + (bb.x2 - bb.x1) + 2)
fs.writeFileSync(`${out}/wordmark-path.txt`, JSON.stringify({ d: wordD, width: wordW }))

const svg = (vb, body, label = "Saywhat") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${label}">${body}</svg>\n`
const files = {
  "logo-mark.svg": svg("0 0 64 64", mark(WHITE, YELLOW)),
  "logo-mark-light.svg": svg("0 0 64 64", mark(INK, YELLOW, ` stroke="${INK}" stroke-width="2.5"`)),
  "logo-mark-mono.svg": svg("0 0 64 64", mark(INK, INK)),
  "logo.svg": svg(`0 0 ${wordW} 64`, mark(WHITE, YELLOW) + `<path fill="${WHITE}" d="${wordD}"/>`),
  "logo-light.svg": svg(`0 0 ${wordW} 64`, mark(INK, YELLOW, ` stroke="${INK}" stroke-width="2.5"`) + `<path fill="${INK}" d="${wordD}"/>`),
  "logo-mono.svg": svg(`0 0 ${wordW} 64`, mark(INK, INK) + `<path fill="${INK}" d="${wordD}"/>`),
  // app icon: mark on a dark rounded tile (reads on light and dark tab bars)
  "icon.svg": svg("0 0 64 64", `<rect width="64" height="64" rx="14" fill="${INK}"/><g transform="translate(6.4 6.4) scale(.8)">${mark(WHITE, YELLOW)}</g>`),
}
for (const [n, c] of Object.entries(files)) fs.writeFileSync(`${out}/${n}`, c)
console.log(wordW, capH, Object.keys(files).map((n) => `${n} ${files[n].length}`).join("\n"))
// apple-icon: full-bleed square (iOS applies its own mask)
fs.writeFileSync(`${out}/apple-icon.svg`, svg("0 0 180 180", `<rect width="180" height="180" fill="${INK}"/><g transform="translate(36 36) scale(1.6875)">${mark(WHITE, YELLOW)}</g>`))
