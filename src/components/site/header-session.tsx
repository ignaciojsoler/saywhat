import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAccount } from "@/lib/session"

/** Swaps the guest buttons for "Open app" when a session exists. Streams in behind <Suspense>. */
export async function HeaderSession({ fallback }: { fallback: React.ReactNode }) {
  const account = await getAccount().catch(() => null)
  if (!account) return fallback
  return (
    <Button asChild className="h-10 rounded-full bg-white px-5 font-semibold text-black">
      <Link href="/app" className="flex items-center gap-1.5">
        Open app
        <ArrowRightIcon className="size-4" />
      </Link>
    </Button>
  )
}
