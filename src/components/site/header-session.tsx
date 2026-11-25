import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAccount } from "@/lib/session"
import { PILL } from "./pill"

/** Swaps the guest buttons for "Open app" when a session exists. Streams in behind <Suspense>. */
export async function HeaderSession({ fallback }: { fallback: React.ReactNode }) {
  const account = await getAccount().catch(() => null)
  if (!account) return fallback
  return (
    <Button asChild className={PILL}>
      <Link href="/app">
        Open app
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Button>
  )
}
