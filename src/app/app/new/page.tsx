import type { Metadata } from "next"
import { Suspense } from "react"
import { UploadFlow } from "@/components/saywhat/app"
import { Page, PageHeader } from "@/components/shell/page-header"

export const metadata: Metadata = { title: "New video · Saywhat" }

export default function NewVideoPage() {
  return (
    <Page className="max-w-3xl">
      <PageHeader
        breadcrumbs={[{ label: "Videos", href: "/app" }, { label: "New video" }]}
        title="New video"
        description="Upload a clip and get word-by-word captions in seconds."
      />
      <Suspense>
        <UploadFlow />
      </Suspense>
    </Page>
  )
}
