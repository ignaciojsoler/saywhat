import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAccount } from "@/lib/session"

/** Swaps the guest buttons for "Open app" when a session exists. Streams in behind <Suspense>. */
export async function HeaderSession({ fallback }: { fallback: React.ReactNode }) {
  const account = await getAccount().catch(() => null)
  if (!account) return fallback
  return (
    <Button asChild className="h-9 px-4 text-sm">
      <Link href="/app">
        Open app
        <ArrowRightIcon />
      </Link>
    </Button>
  )
}
