import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Page, PageHeader } from "@/components/shell/page-header"
import { VideosDashboard } from "@/components/videos/videos-dashboard"
import { getCreditHistory } from "@/lib/credit-history"
import { listProjects } from "@/lib/projects"
import { requireAccount } from "@/lib/session"

export const metadata: Metadata = { title: "Videos · Saywhat" }

export default function VideosPage() {
  return (
    <Page>
      <PageHeader
        title="Videos"
        description="Your captioned videos. Pick up where you left off."
        actions={
          <Button asChild className="h-9 gap-1.5 px-3.5 text-sm font-semibold">
            <Link href="/app/new">
              <PlusIcon className="size-4" />
              New video
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<GridSkeleton />}>
        <Videos />
      </Suspense>
    </Page>
  )
}

async function Videos() {
  const account = await requireAccount()
  const [projects, history] = await Promise.all([listProjects(account.id), getCreditHistory(account.id)])
  return <VideosDashboard projects={projects} hasSpent={history.hasSpent} hasPurchased={history.hasPurchased} />
}

function GridSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      <div className="bg-card h-20 animate-pulse rounded-2xl border" />
      <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="bg-card aspect-video animate-pulse rounded-xl" />
            <div className="bg-card h-4 w-2/3 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
