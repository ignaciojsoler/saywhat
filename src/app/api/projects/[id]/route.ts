import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { ProjectPatchSchema } from "@/lib/project-schema"
import { updateProject } from "@/lib/projects"

/**
 * PATCH /api/projects/:id — editor autosave (title, words, style, aspect, exported).
 * A route handler rather than a Server Action so the last save can go out with `keepalive`
 * while the user navigates away or closes the tab.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/projects/[id]">) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return Response.json({ error: "Sign in again to keep saving." }, { status: 401 })

  const { id } = await ctx.params
  const body = await request.json().catch(() => null)
  const patch = ProjectPatchSchema.safeParse(body)
  if (!patch.success) return Response.json({ error: "Invalid changes." }, { status: 400 })

  const updatedAt = await updateProject(session.user.id, id, patch.data)
  if (updatedAt === null) return Response.json({ error: "This video doesn't exist anymore." }, { status: 404 })
  return Response.json({ updatedAt })
}
