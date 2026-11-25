import { describe, expect, it } from "vitest"
import { isPendingUploadExpired, PENDING_UPLOAD_TTL_MS } from "@/lib/local-videos"

describe("isPendingUploadExpired", () => {
  it("not expired within TTL", () => {
    const now = 1_000_000
    expect(isPendingUploadExpired(now - 1000, now)).toBe(false)
  })
  it("expired after TTL", () => {
    const now = 1_000_000
    expect(isPendingUploadExpired(now - PENDING_UPLOAD_TTL_MS - 1, now)).toBe(true)
  })
  it("boundary: exactly TTL is not expired", () => {
    const now = 1_000_000
    expect(isPendingUploadExpired(now - PENDING_UPLOAD_TTL_MS, now)).toBe(false)
  })
})