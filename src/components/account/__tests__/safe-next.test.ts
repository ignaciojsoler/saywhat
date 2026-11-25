import { describe, expect, it } from "vitest"
import { safeNext } from "../auth-form"

describe("safeNext", () => {
  it("allows /app/new?pending=1", () => {
    expect(safeNext("/app/new?pending=1")).toBe("/app/new?pending=1")
  })
  it("rejects //evil.com", () => {
    expect(safeNext("//evil.com")).toBe("/app")
  })
  it("rejects https://evil.com", () => {
    expect(safeNext("https://evil.com")).toBe("/app")
  })
  it("falls back on null", () => {
    expect(safeNext(null)).toBe("/app")
  })
})