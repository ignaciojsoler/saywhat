import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { ProjectEditor } from "@/components/saywhat/project-editor"
import { getProject } from "@/lib/projects"
import { requireAccount } from "@/lib/session"

export const metadata: Metadata = { title: "Editor · Saywhat" }

export default function VideoPage({ params }: PageProps<"/app/videos/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="grid h-[calc(100dvh-3.5rem)] place-items-center md:h-dvh">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      }
    >
      <LoadProject params={params} />
    </Suspense>
  )
}

async function LoadProject({ params }: Pick<PageProps<"/app/videos/[id]">, "params">) {
  const { id } = await params
  const account = await requireAccount(`/app/videos/${id}`)
  const project = await getProject(account.id, id)
  if (!project) notFound()
  return <ProjectEditor key={project.id} project={project} />
}
