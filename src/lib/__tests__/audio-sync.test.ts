import { describe, expect, it } from "vitest"
import { driftRatio } from "../audio-sync"

describe("driftRatio", () => {
  it("detects more audio than the timeline holds (Loom-style clock drift)", () => {
    expect(driftRatio(111.872, 109.9505)).toBeCloseTo(1.01747, 4)
  })
  it("ignores encoder padding and tiny differences", () => {
    expect(driftRatio(60.043, 60)).toBe(1)
    expect(driftRatio(10.2, 10)).toBe(1) // 0.2 s: under the absolute threshold
  })
  it("never stretches a soundtrack that is shorter than the video", () => {
    expect(driftRatio(50, 60)).toBe(1)
  })
  it("handles unreadable durations", () => {
    expect(driftRatio(0, 60)).toBe(1)
    expect(driftRatio(60, 0)).toBe(1)
    expect(driftRatio(60, Number.NaN)).toBe(1)
  })
})
