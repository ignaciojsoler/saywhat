import "server-only"
import { randomUUID } from "node:crypto"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { project } from "@/db/schema"
import type { Aspect, CaptionStyle, Word } from "./captions/types"
import { StyleSchema, titleFromFileName, type ProjectData, type ProjectPatch, type ProjectSummary } from "./project-schema"

/**
 * Project data layer. Every function takes the signed-in user's id and scopes the query to it,
 * so a project id from another account behaves exactly like one that doesn't exist.
 */

const summaryColumns = {
  id: project.id,
  title: project.title,
  fileName: project.fileName,
  fileSize: project.fileSize,
  duration: project.duration,
  aspect: project.aspect,
  wordCount: sql<number>`json_array_length(${project.words})`,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  lastExportedAt: project.lastExportedAt,
}

type SummaryRow = {
  id: string
  title: string
  fileName: string
  fileSize: number
  duration: number
  aspect: string
  wordCount: number
  createdAt: Date
  updatedAt: Date
  lastExportedAt: Date | null
}

const toSummary = (r: SummaryRow): ProjectSummary => ({
  id: r.id,
  title: r.title,
  fileName: r.fileName,
  fileSize: r.fileSize,
  duration: r.duration,
  aspect: r.aspect as Aspect,
  wordCount: Number(r.wordCount) || 0,
  createdAt: r.createdAt.getTime(),
  updatedAt: r.updatedAt.getTime(),
  lastExportedAt: r.lastExportedAt?.getTime() ?? null,
})

export type NewProject = {
  fileName: string
  fileSize: number
  duration: number
  words: Word[]
  timingSource: "words" | "vtt"
}

export async function createProject(userId: string, input: NewProject): Promise<string> {
  const id = randomUUID()
  await db.insert(project).values({
    id,
    userId,
    title: titleFromFileName(input.fileName),
    fileName: input.fileName.slice(0, 255),
    fileSize: Math.max(0, Math.round(input.fileSize) || 0),
    duration: Math.max(0, input.duration || 0),
    words: input.words,
    timingSource: input.timingSource,
  })
  return id
}

export async function listProjects(userId: string, limit?: number): Promise<ProjectSummary[]> {
  const q = db.select(summaryColumns).from(project).where(eq(project.userId, userId)).orderBy(desc(project.updatedAt))
  const rows = limit ? await q.limit(limit) : await q
  return rows.map(toSummary)
}

export async function countProjects(userId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(project).where(eq(project.userId, userId))
  return Number(row?.n ?? 0)
}

export async function getProject(userId: string, id: string): Promise<ProjectData | null> {
  const row = await db.query.project.findFirst({ where: and(eq(project.id, id), eq(project.userId, userId)) })
  if (!row) return null
  // the client merges it over the current defaults (sanitizeStyle)
  const style = StyleSchema.safeParse(row.style)
  return {
    ...toSummary({ ...row, wordCount: row.words.length }),
    words: row.words,
    style: style.success ? (style.data as unknown as CaptionStyle) : null,
    timingSource: row.timingSource,
  }
}

/** Applies an autosave patch. Returns the new updatedAt (epoch ms), or null if the project isn't the user's. */
export async function updateProject(userId: string, id: string, patch: ProjectPatch): Promise<number | null> {
  const { exported, ...fields } = patch
  const [row] = await db
    .update(project)
    .set({ ...fields, ...(exported ? { lastExportedAt: new Date() } : {}), updatedAt: new Date() })
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning({ updatedAt: project.updatedAt })
  return row ? row.updatedAt.getTime() : null
}

/** Deletes a project. Credits are not refunded: the transcription already happened. */
export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning({ id: project.id })
  return rows.length > 0
}

/** Copies transcript and style into a new project (no credit spent). Returns the new id, or null. */
export async function duplicateProject(userId: string, id: string): Promise<string | null> {
  const src = await db.query.project.findFirst({ where: and(eq(project.id, id), eq(project.userId, userId)) })
  if (!src) return null
  const copy = randomUUID()
  await db.insert(project).values({
    id: copy,
    userId,
    title: `${src.title} (copy)`.slice(0, 120),
    fileName: src.fileName,
    fileSize: src.fileSize,
    duration: src.duration,
    aspect: src.aspect,
    words: src.words,
    style: src.style,
    timingSource: src.timingSource,
  })
  return copy
}
