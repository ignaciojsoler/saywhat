import { describe, expect, it } from "vitest"
import { activeLineAt, activeWordAt, groupWords, replaceLineText } from "../timing"
import { toSRT, toVTT } from "../formats"
import type { Word } from "../types"

const W = (w: string, s: number, e: number): Word => ({ w, s, e })
const words = [W("hola", 0, 0.3), W("qué", 0.35, 0.5), W("tal.", 0.55, 0.8), W("todo", 2, 2.2), W("bien", 2.25, 2.5)]

describe("groupWords", () => {
  it("corta por fin de oración y por pausas largas", () => {
    expect(groupWords(words, 10)).toEqual([[0, 3], [3, 5]])
  })
  it("respeta el máximo por línea", () => {
    expect(groupWords(words, 2)).toEqual([[0, 2], [2, 3], [3, 5]])
  })
})

describe("activos", () => {
  const lines = groupWords(words, 10)
  it("línea visible y hold después del final", () => {
    expect(activeLineAt(words, lines, 0.1)).toBe(0)
    expect(activeLineAt(words, lines, 1.1)).toBe(0) // dentro del hold de 0.4 s
    expect(activeLineAt(words, lines, 1.5)).toBe(-1)
    expect(activeLineAt(words, lines, 2.3)).toBe(1)
  })
  it("palabra activa", () => {
    expect(activeWordAt(words, lines[0], 0.4)).toBe(1)
  })
})

describe("replaceLineText", () => {
  it("misma cantidad: conserva tiempos", () => {
    const out = replaceLineText(words, [0, 3], "Hola qué tal?")
    expect(out.slice(0, 3).map((w) => [w.w, w.s])).toEqual([["Hola", 0], ["qué", 0.35], ["tal?", 0.55]])
  })
  it("otra cantidad: reparte el tramo", () => {
    const out = replaceLineText(words, [0, 3], "buenas")
    expect(out[0]).toEqual({ w: "buenas", s: 0, e: 0.8 })
    expect(out).toHaveLength(3)
  })
})

describe("formatos", () => {
  const lines = groupWords(words, 10)
  it("SRT", () => {
    expect(toSRT(words, lines)).toBe("1\n00:00:00,000 --> 00:00:00,800\nhola qué tal.\n\n2\n00:00:02,000 --> 00:00:02,500\ntodo bien\n")
  })
  it("VTT", () => {
    expect(toVTT(words, lines).startsWith("WEBVTT\n\n00:00:00.000 --> 00:00:00.800\nhola qué tal.")).toBe(true)
  })
})
