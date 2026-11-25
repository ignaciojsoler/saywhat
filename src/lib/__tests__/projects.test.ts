import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { Transcriber } from "../transcription"

const dir = mkdtempSync(path.join(tmpdir(), "saywhat-projects-"))
let db: typeof import("@/db").db
let schema: typeof import("@/db/schema")
let projects: typeof import("../projects")
let transcribeToProject: typeof import("../transcription").transcribeToProject

const words = [
  { w: "hello", s: 0, e: 0.4 },
  { w: "world", s: 0.4, e: 0.9 },
]
const meta = { fileName: "clip.final.mp4", fileSize: 1234, duration: 12.5 }
const audio = new ArrayBuffer(8)

beforeAll(async () => {
  vi.stubEnv("DATABASE_URL", `file:${path.join(dir, "test.db")}`)
  ;({ db } = await import("@/db"))
  schema = await import("@/db/schema")
  projects = await import("../projects")
  ;({ transcribeToProject } = await import("../transcription"))
  const { migrate } = await import("drizzle-orm/libsql/migrator")
  await migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, "../../../drizzle") })
  await db.insert(schema.user).values([
    { id: "ana", name: "Ana", email: "ana@example.com", credits: 2 },
    { id: "bob", name: "Bob", email: "bob@example.com", credits: 0 },
  ])
})
afterAll(() => {
  vi.unstubAllEnvs()
  rmSync(dir, { recursive: true, force: true })
})

const credits = async (id: string) => (await db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, id) }))!.credits
const ledger = async (id: string) => db.query.creditLedger.findMany({ where: (l, { eq }) => eq(l.userId, id) })

describe("transcribeToProject", () => {
  it("spends a credit and saves the transcript as a project", async () => {
    const ok: Transcriber = async () => ({ text: "hello world", words, source: "words" })
    const out = await transcribeToProject("ana", audio, meta, ok)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.credits).toBe(1)
    expect(await credits("ana")).toBe(1)

    const p = await projects.getProject("ana", out.projectId)
    expect(p).toMatchObject({ title: "clip.final", fileName: "clip.final.mp4", fileSize: 1234, duration: 12.5, words, style: null, timingSource: "words" })
  })

  it("refunds the credit and creates no project when transcription fails", async () => {
    const before = (await projects.listProjects("ana")).length
    const bad: Transcriber = async () => ({ error: "No speech found in this video.", status: 422 })
    const out = await transcribeToProject("ana", audio, meta, bad)
    expect(out).toMatchObject({ ok: false, status: 422, credits: 1 })
    expect(await credits("ana")).toBe(1)
    expect((await projects.listProjects("ana")).length).toBe(before)
    expect((await ledger("ana")).map((l) => l.reason)).toEqual(["video", "video", "refund"])
  })

  it("refunds when the transcriber throws", async () => {
    const before = (await projects.listProjects("ana")).length
    const boom: Transcriber = async () => {
      throw new Error("network")
    }
    const out = await transcribeToProject("ana", audio, meta, boom)
    expect(out.ok).toBe(false)
    expect(await credits("ana")).toBe(1)
    expect((await projects.listProjects("ana")).length).toBe(before)
  })

  it("refuses without credits and never calls the transcriber", async () => {
    const spy = vi.fn<Transcriber>()
    const out = await transcribeToProject("bob", audio, meta, spy)
    expect(out).toMatchObject({ ok: false, status: 402, code: "no_credits" })
    expect(spy).not.toHaveBeenCalled()
    expect(await projects.listProjects("bob")).toEqual([])
  })
})

describe("project ownership", () => {
  let id: string
  beforeAll(async () => {
    id = await projects.createProject("ana", { ...meta, words, timingSource: "vtt" })
  })

  it("lists only the owner's projects, with a word count and no transcript", async () => {
    const list = await projects.listProjects("ana")
    const row = list.find((p) => p.id === id)!
    expect(row.wordCount).toBe(2)
    expect(row).not.toHaveProperty("words")
    expect(await projects.listProjects("bob")).toEqual([])
    expect(await projects.countProjects("ana")).toBe(list.length)
  })

  it("hides another user's project", async () => {
    expect(await projects.getProject("bob", id)).toBeNull()
    expect(await projects.getProject("ana", "missing")).toBeNull()
  })

  it("only lets the owner update", async () => {
    expect(await projects.updateProject("bob", id, { title: "Hijacked" })).toBeNull()
    expect((await projects.getProject("ana", id))!.title).toBe("clip.final")

    const at = await projects.updateProject("ana", id, { title: "My clip", aspect: "9:16", words: [{ w: "hi", s: 0, e: 1 }], exported: true })
    expect(typeof at).toBe("number")
    const p = (await projects.getProject("ana", id))!
    expect(p).toMatchObject({ title: "My clip", aspect: "9:16", words: [{ w: "hi", s: 0, e: 1 }] })
    expect(p.lastExportedAt).not.toBeNull()
  })

  it("only lets the owner duplicate", async () => {
    expect(await projects.duplicateProject("bob", id)).toBeNull()
    const copy = await projects.duplicateProject("ana", id)
    expect(copy).toBeTruthy()
    expect((await projects.getProject("ana", copy!))!.title).toBe("My clip (copy)")
  })

  it("only lets the owner delete, and deleting doesn't refund credits", async () => {
    const before = await credits("ana")
    expect(await projects.deleteProject("bob", id)).toBe(false)
    expect(await projects.getProject("ana", id)).not.toBeNull()
    expect(await projects.deleteProject("ana", id)).toBe(true)
    expect(await projects.getProject("ana", id)).toBeNull()
    expect(await credits("ana")).toBe(before)
  })
})
