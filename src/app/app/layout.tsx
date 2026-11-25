import type { Metadata } from "next"
import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { AccountProvider } from "@/components/account/account-provider"
import { AppShell } from "@/components/shell/app-shell"
import { listProjects } from "@/lib/projects"
import { requireAccount } from "@/lib/session"

export const metadata: Metadata = { title: "Saywhat" }

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <Spinner className="text-muted-foreground size-5" />
        </div>
      }
    >
      <AccountGate>{children}</AccountGate>
    </Suspense>
  )
}

async function AccountGate({ children }: { children: React.ReactNode }) {
  const account = await requireAccount()
  const recents = await listProjects(account.id, 5)
  return (
    <AccountProvider account={account}>
      <AppShell recents={recents}>{children}</AppShell>
    </AccountProvider>
  )
}
