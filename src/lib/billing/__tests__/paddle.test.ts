import { createHmac } from "node:crypto"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { transactionAmount, verifyPaddleSignature, type Transaction } from "../paddle"
import { pickProvider } from "../providers"

describe("verifyPaddleSignature", () => {
  const secret = "pdl_ntfset_test_secret"
  const rawBody = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_1" } })
  const ts = "1764000000"
  const now = Number(ts) * 1000 + 1_000
  const sign = (body: string, key = secret, t = ts) => createHmac("sha256", key).update(`${t}:${body}`).digest("hex")

  it("accepts a valid signature", () => {
    expect(verifyPaddleSignature({ header: `ts=${ts};h1=${sign(rawBody)}`, rawBody, secret, maxAgeMs: 5000, now })).toBe(true)
  })

  it("accepts any matching h1 while secrets rotate", () => {
    const header = `ts=${ts};h1=${sign(rawBody, "old-secret")};h1=${sign(rawBody)}`
    expect(verifyPaddleSignature({ header, rawBody, secret })).toBe(true)
  })

  it("rejects a modified body, a wrong secret, a swapped timestamp and bad headers", () => {
    const header = `ts=${ts};h1=${sign(rawBody)}`
    expect(verifyPaddleSignature({ header, rawBody: rawBody + " ", secret })).toBe(false)
    expect(verifyPaddleSignature({ header, rawBody, secret: "nope" })).toBe(false)
    expect(verifyPaddleSignature({ header: `ts=1764000001;h1=${sign(rawBody)}`, rawBody, secret })).toBe(false)
    expect(verifyPaddleSignature({ header: null, rawBody, secret })).toBe(false)
    expect(verifyPaddleSignature({ header: `h1=${sign(rawBody)}`, rawBody, secret })).toBe(false)
    expect(verifyPaddleSignature({ header: `ts=${ts}`, rawBody, secret })).toBe(false)
    expect(verifyPaddleSignature({ header: `ts=${ts};h1=zz`, rawBody, secret })).toBe(false)
  })

  it("rejects stale notifications when maxAge is set", () => {
    const base = { header: `ts=${ts};h1=${sign(rawBody)}`, rawBody, secret, maxAgeMs: 60_000 }
    expect(verifyPaddleSignature({ ...base, now: Number(ts) * 1000 + 30_000 })).toBe(true)
    expect(verifyPaddleSignature({ ...base, now: Number(ts) * 1000 + 120_000 })).toBe(false)
  })
})

const txn = (t: Partial<Transaction> & { cents?: string; quantity?: number }): Transaction => ({
  id: "txn_1",
  status: "completed",
  currency_code: "USD",
  custom_data: { order_id: "po1" },
  checkout: { url: "http://localhost:3000/pay?_ptxn=txn_1" },
  items: [{ quantity: t.quantity ?? 1, price: { unit_price: { amount: t.cents ?? "1500", currency_code: "USD" } } }],
  details: { totals: { discount: "0" } },
  ...t,
})

describe("transactionAmount", () => {
  it("returns whole dollars from unit prices, minus discounts", () => {
    expect(transactionAmount(txn({}))).toBe(15)
    expect(transactionAmount(txn({ quantity: 2 }))).toBe(30)
    expect(transactionAmount(txn({ details: { totals: { discount: "500" } } }))).toBe(10)
  })
})

describe("pickProvider", () => {
  const both = ["paddle", "mercadopago"] as const
  it("defaults to USD (Paddle), and to Mercado Pago for Argentina", () => {
    expect(pickProvider({ available: [...both] })).toBe("paddle")
    expect(pickProvider({ country: "US", available: [...both] })).toBe("paddle")
    expect(pickProvider({ country: "AR", available: [...both] })).toBe("mercadopago")
  })
  it("honours an explicit choice only when that provider is configured", () => {
    expect(pickProvider({ requested: "usd", country: "AR", available: [...both] })).toBe("paddle")
    expect(pickProvider({ requested: "ars", country: "DE", available: [...both] })).toBe("mercadopago")
    expect(pickProvider({ requested: "ars", available: ["paddle"] })).toBe("paddle")
    expect(pickProvider({ country: "AR", available: [] })).toBeNull()
  })
})

describe("syncPaddleTransaction", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "saywhat-paddle-test-"))
  let db: typeof import("@/db").db
  let schema: typeof import("@/db/schema")
  let orders: typeof import("../orders")

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "test.db")}`)
    ;({ db } = await import("@/db"))
    schema = await import("@/db/schema")
    orders = await import("../orders")
    const { migrate } = await import("drizzle-orm/libsql/migrator")
    await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, "../../../../drizzle") })
    await db.insert(schema.user).values({ id: "u1", name: "Ana", email: "ana@example.com", credits: 3 })
    await db.insert(schema.order).values([
      { id: "po1", userId: "u1", packId: "creator", credits: 40, amount: 15, currency: "USD", provider: "paddle", preferenceId: "txn_1" },
      { id: "mo1", userId: "u1", packId: "starter", credits: 10, amount: 4900, currency: "ARS", provider: "mercadopago" },
    ])
  })
  afterAll(() => {
    vi.unstubAllEnvs()
    rmSync(dir, { recursive: true, force: true })
  })

  const sync = (t: Partial<Transaction> & { cents?: string }) => orders.syncPaddleTransaction(t.id ?? "txn_1", async () => txn(t))
  const credits = async () => (await db.query.user.findFirst())!.credits

  it("does not credit a transaction that isn't paid yet", async () => {
    expect(await sync({ status: "ready" })).toMatchObject({ ok: true, status: "ready", paid: false, credited: false })
    expect(await credits()).toBe(3)
  })

  it("rejects a wrong amount, currency or a transaction that isn't the order's", async () => {
    expect(await sync({ cents: "100" })).toEqual({ ok: false, reason: "mismatch" })
    expect(await sync({ currency_code: "EUR" })).toEqual({ ok: false, reason: "mismatch" })
    expect(await sync({ id: "txn_other" })).toEqual({ ok: false, reason: "mismatch" })
    expect(await credits()).toBe(3)
  })

  it("ignores unknown orders and orders of another provider", async () => {
    expect(await sync({ custom_data: { order_id: "nope" } })).toEqual({ ok: false, reason: "unknown_order" })
    expect(await sync({ custom_data: null })).toEqual({ ok: false, reason: "unknown_order" })
    expect(await sync({ custom_data: { order_id: "mo1" }, cents: "490000" })).toEqual({ ok: false, reason: "unknown_order" })
  })

  it("credits a paid transaction exactly once, across paid → completed and repeated deliveries", async () => {
    const results = [await sync({ status: "paid" }), await sync({ status: "completed" }), await sync({ status: "completed" })]
    expect(results.map((r) => r.ok && r.credited)).toEqual([true, false, false])
    expect(await credits()).toBe(43)
    const o = await db.query.order.findFirst({ where: (t, { eq }) => eq(t.id, "po1") })
    expect(o).toMatchObject({ status: "completed", paymentId: "txn_1" })
    expect(o?.creditedAt).toBeInstanceOf(Date)
    const ledger = await db.query.creditLedger.findMany()
    expect(ledger.filter((l) => l.reason === "purchase" && l.note === "po1")).toHaveLength(1)
  })
})
