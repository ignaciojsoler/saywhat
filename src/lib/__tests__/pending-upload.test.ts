import { describe, expect, it } from "vitest"
import { isPendingUploadExpired, PENDING_UPLOAD_TTL_MS } from "../local-videos"

describe("isPendingUploadExpired", () => {
  it("not expired within 1 hour", () => {
    const now = 1_000_000
    expect(isPendingUploadExpired(now - 1000, now)).toBe(false)
  })
  it("expired after 1 hour", () => {
    const now = 1_000_000
    expect(isPendingUploadExpired(now - PENDING_UPLOAD_TTL_MS - 1, now)).toBe(true)
  })
  it("not expired exactly at boundary", () => {
    const now = 1_000_000
    expect(isPendingUploadExpired(now - PENDING_UPLOAD_TTL_MS, now)).toBe(false)
  })
})