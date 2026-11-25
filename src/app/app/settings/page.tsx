import type { Metadata } from "next"
import { Suspense } from "react"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { account as accountTable } from "@/db/schema"
import { Page, PageHeader } from "@/components/shell/page-header"
import { requireAccount } from "@/lib/session"
import { SettingsView } from "./client"

export const metadata: Metadata = { title: "Settings · Saywhat" }

export default function SettingsPage() {
  return (
    <Page className="max-w-3xl">
      <PageHeader title="Settings" description="Your profile, sign-in and what Saywhat keeps on this device." />
      <Suspense fallback={<div className="bg-card h-96 animate-pulse rounded-2xl border" />}>
        <Settings />
      </Suspense>
    </Page>
  )
}

async function Settings() {
  const account = await requireAccount("/app/settings")
  const links = await db.query.account.findMany({ where: eq(accountTable.userId, account.id), columns: { providerId: true } })
  const providers = new Set(links.map((l) => l.providerId))
  return <SettingsView hasPassword={providers.has("credential")} google={providers.has("google")} />
}
