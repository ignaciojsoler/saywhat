import { createHmac } from "node:crypto"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { verifyWebhookSignature, type Payment } from "../mercadopago"

describe("verifyWebhookSignature", () => {
  const secret = "test-secret"
  const sign = (manifest: string) => createHmac("sha256", secret).update(manifest).digest("hex")
  const ts = "1764000000"

  it("accepts a valid signature", () => {
    const v1 = sign(`id:123456;request-id:req-1;ts:${ts};`)
    expect(verifyWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123456", secret })).toBe(true)
  })

  it("lowercases alphanumeric ids like Mercado Pago does", () => {
    const v1 = sign(`id:abc123;request-id:req-1;ts:${ts};`)
    expect(verifyWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "ABC123", secret })).toBe(true)
  })

  it("rejects a tampered id, a wrong secret and a missing header", () => {
    const v1 = sign(`id:123456;request-id:req-1;ts:${ts};`)
    expect(verifyWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "999", secret })).toBe(false)
    expect(verifyWebhookSignature({ signature: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123456", secret: "nope" })).toBe(false)
    expect(verifyWebhookSignature({ signature: null, requestId: "req-1", dataId: "123456", secret })).toBe(false)
  })

  it("rejects stale notifications when maxAge is set", () => {
    const v1 = sign(`id:1;request-id:r;ts:${ts};`)
    const base = { signature: `ts=${ts},v1=${v1}`, requestId: "r", dataId: "1", secret, maxAgeMs: 60_000 }
    expect(verifyWebhookSignature({ ...base, now: Number(ts) * 1000 + 30_000 })).toBe(true)
    expect(verifyWebhookSignature({ ...base, now: Number(ts) * 1000 + 120_000 })).toBe(false)
  })
})

describe("syncMercadoPagoPayment", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "saywhat-test-"))
  let db: typeof import("@/db").db
  let schema: typeof import("@/db/schema")
  let syncPayment: typeof import("../orders").syncMercadoPagoPayment

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "test.db")}`)
    ;({ db } = await import("@/db"))
    schema = await import("@/db/schema")
    ;({ syncMercadoPagoPayment: syncPayment } = await import("../orders"))
    const { migrate } = await import("drizzle-orm/libsql/migrator")
    await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, "../../../../drizzle") })
    await db.insert(schema.user).values({ id: "u1", name: "Ana", email: "ana@example.com", credits: 3 })
    await db.insert(schema.order).values({ id: "o1", userId: "u1", packId: "starter", credits: 10, amount: 4900, currency: "ARS" })
  })
  afterAll(() => {
    vi.unstubAllEnvs()
    rmSync(dir, { recursive: true, force: true })
  })

  const payment = (p: Partial<Payment>): (() => Promise<Payment>) => async () => ({
    id: "p1",
    status: "approved",
    external_reference: "o1",
    transaction_amount: 4900,
    currency_id: "ARS",
    ...p,
  })
  const credits = async () => (await db.query.user.findFirst())!.credits

  it("does not credit a pending payment", async () => {
    const r = await syncPayment("p1", payment({ status: "in_process" }))
    expect(r).toMatchObject({ ok: true, status: "in_process", paid: false, credited: false })
    expect(await credits()).toBe(3)
  })

  it("rejects a payment whose amount doesn't match the order", async () => {
    const r = await syncPayment("p0", payment({ id: "p0", transaction_amount: 10 }))
    expect(r).toEqual({ ok: false, reason: "mismatch" })
    expect(await credits()).toBe(3)
  })

  it("credits an approved payment exactly once", async () => {
    // the mismatch above flagged the order; a correct payment for it still goes through
    const first = await syncPayment("p1", payment({}))
    const second = await syncPayment("p1", payment({}))
    expect(first).toMatchObject({ ok: true, credited: true })
    expect(second).toMatchObject({ ok: true, credited: false })
    expect(await credits()).toBe(13)
    const ledger = await db.query.creditLedger.findMany()
    expect(ledger.filter((l) => l.reason === "purchase")).toHaveLength(1)
  })

  it("ignores payments for unknown orders", async () => {
    expect(await syncPayment("p9", payment({ id: "p9", external_reference: "nope" }))).toEqual({ ok: false, reason: "unknown_order" })
  })
})
