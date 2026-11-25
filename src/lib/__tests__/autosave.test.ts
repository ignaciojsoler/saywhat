import { describe, expect, it } from "vitest"
import type { CaptionStyle, Word } from "../captions/types"
import { diffSnapshot, normalizeSnapshot, type EditorSnapshot } from "../project-schema"

const words: Word[] = [
  { w: "hello", s: 0, e: 0.4 },
  { w: "world", s: 0.4, e: 0.9 },
]

/** What an older client stored: only the fields it knew, plus a legacy flag. */
const loaded: EditorSnapshot = {
  words,
  style: { font: "montserrat", size: 6.2, uppercase: true } as unknown as CaptionStyle,
  aspect: "9:16",
  title: "My clip",
}

describe("autosave diff", () => {
  it("reports no change between the loaded state and its normalized self", () => {
    expect(diffSnapshot(loaded, normalizeSnapshot(loaded))).toBeNull()
    expect(diffSnapshot(normalizeSnapshot(loaded), normalizeSnapshot(loaded))).toBeNull()
  })

  it("reports a change when a word changes", () => {
    const baseline = normalizeSnapshot(loaded)
    const edited: EditorSnapshot = {
      ...baseline,
      words: [baseline.words[0], { ...baseline.words[1], w: "there" }],
    }
    expect(diffSnapshot(baseline, edited)).toEqual({ words: edited.words })
  })

  it("reports a change when the style changes", () => {
    const baseline = normalizeSnapshot(loaded)
    const style = baseline.style as CaptionStyle
    const edited: EditorSnapshot = { ...baseline, style: { ...style, size: 5 } }
    expect(diffSnapshot(baseline, edited)).toEqual({ style: edited.style })
  })
})
