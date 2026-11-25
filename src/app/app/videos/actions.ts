"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { TitleSchema } from "@/lib/project-schema"
import { deleteProject, duplicateProject, updateProject } from "@/lib/projects"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function userId() {
  const s = await auth.api.getSession({ headers: await headers() })
  return s?.user.id ?? null
}

const SIGNED_OUT = { ok: false as const, error: "Your session expired. Sign in again." }
const MISSING = { ok: false as const, error: "This video doesn't exist anymore." }

export async function renameVideo(id: string, title: string): Promise<Result<{ title: string }>> {
  const uid = await userId()
  if (!uid) return SIGNED_OUT
  const t = TitleSchema.safeParse(title)
  if (!t.success) return { ok: false, error: "Give it a name (up to 120 characters)." }
  return (await updateProject(uid, String(id), { title: t.data })) === null ? MISSING : { ok: true, title: t.data }
}

export async function deleteVideo(id: string): Promise<Result> {
  const uid = await userId()
  if (!uid) return SIGNED_OUT
  return (await deleteProject(uid, String(id))) ? { ok: true } : MISSING
}

export async function duplicateVideo(id: string): Promise<Result<{ id: string }>> {
  const uid = await userId()
  if (!uid) return SIGNED_OUT
  const copy = await duplicateProject(uid, String(id))
  return copy ? { ok: true, id: copy } : MISSING
}
