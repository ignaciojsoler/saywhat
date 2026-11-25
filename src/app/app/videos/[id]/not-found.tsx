import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function VideoNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Video not found</h1>
      <p className="text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
      <Button asChild className="h-9 px-4 text-sm">
        <Link href="/app">Back to videos</Link>
      </Button>
    </main>
  )
}
