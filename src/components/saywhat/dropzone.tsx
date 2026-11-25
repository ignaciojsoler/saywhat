"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CoinsIcon, FilmIcon, PlayIcon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppHeader } from "@/components/account/app-header"
import { useAccount } from "@/components/account/account-provider"
import { cn } from "@/lib/utils"
import { MAX_SECONDS } from "@/lib/pipeline"

// optional sample clip for the "Try the sample" button: drop one of these into /public
const SAMPLE_URLS = ["/sample.mp4", "/sample.webm"]

const TIPS = [
  "Clear speech close to the mic gives the best timing.",
  "Vertical 9:16 clips look best on Reels, TikTok and Shorts.",
  "You can fix any word after transcription. Timing stays in sync.",
]

/** Upload screen of the app. The whole window is a drop target. */
export function Dropzone({ onFile }: { onFile: (f: File) => void }) {
  const { account } = useAccount()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [sampleUrl, setSampleUrl] = useState<string | null>(null)
  const empty = account.credits <= 0
  const firstName = account.name.split(" ")[0]

  useEffect(() => {
    ;(async () => {
      for (const url of SAMPLE_URLS) {
        const r = await fetch(url, { method: "HEAD" }).catch(() => null)
        if (r?.ok && (r.headers.get("content-type") ?? "").startsWith("video")) return setSampleUrl(url)
      }
    })()
  }, [])

  // drop anywhere on the page
  useEffect(() => {
    let depth = 0
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return
      depth++
      setDragging(true)
    }
    const leave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setDragging(false)
    }
    const over = (e: DragEvent) => e.preventDefault()
    const drop = (e: DragEvent) => {
      e.preventDefault()
      depth = 0
      setDragging(false)
      const f = e.dataTransfer?.files?.[0]
      if (f) onFile(f)
    }
    window.addEventListener("dragenter", enter)
    window.addEventListener("dragleave", leave)
    window.addEventListener("dragover", over)
    window.addEventListener("drop", drop)
    return () => {
      window.removeEventListener("dragenter", enter)
      window.removeEventListener("dragleave", leave)
      window.removeEventListener("dragover", over)
      window.removeEventListener("drop", drop)
    }
  }, [onFile])

  const trySample = async () => {
    if (!sampleUrl) return
    const blob = await (await fetch(sampleUrl)).blob()
    onFile(new File([blob], sampleUrl.slice(1), { type: blob.type || "video/mp4" }))
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-5 py-12 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Hi {firstName}, what are we captioning?</h1>
          <p className="text-muted-foreground text-lg">
            {empty
              ? "You're out of credits. Grab a pack to keep going."
              : `You have ${account.credits} ${account.credits === 1 ? "video" : "videos"} left. Each one costs 1 credit.`}
          </p>
        </div>

        {empty ? (
          <div className="bg-card flex flex-col items-center gap-5 rounded-3xl border px-6 py-14 text-center">
            <span className="bg-primary/12 text-primary grid size-14 place-items-center rounded-2xl">
              <CoinsIcon className="size-6" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-semibold">No credits left</h2>
              <p className="text-muted-foreground max-w-sm">Packs start at 10 videos. Pay with card or Mercado Pago, credits arrive instantly.</p>
            </div>
            <Button asChild size="lg" className="h-11 px-6 text-[15px]">
              <Link href="/app/credits">Buy credits</Link>
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={cn(
              "group focus-visible:ring-ring flex flex-col items-center gap-5 rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-colors outline-none focus-visible:ring-2",
              "hover:border-primary/60 hover:bg-primary/[0.04] border-foreground/15",
            )}
          >
            <span className="bg-primary text-primary-foreground grid size-14 place-items-center rounded-2xl shadow-[0_12px_40px_-12px_rgb(255_225_77/0.6)] transition-transform group-hover:-translate-y-0.5">
              <UploadIcon className="size-6" />
            </span>
            <span className="flex flex-col gap-1.5">
              <span className="text-xl font-semibold">Drop a video or click to upload</span>
              <span className="text-muted-foreground">MP4, MOV or WebM, up to {MAX_SECONDS / 60} minutes</span>
            </span>
          </button>
        )}
        <input ref={input} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <ul className="flex flex-col gap-2.5">
            {TIPS.map((t) => (
              <li key={t} className="text-muted-foreground flex items-start gap-2.5 text-sm">
                <FilmIcon className="text-foreground/50 mt-0.5 size-3.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
          {sampleUrl && !empty && (
            <Button variant="outline" onClick={trySample} className="shrink-0">
              <PlayIcon />
              Try the sample
            </Button>
          )}
        </div>
      </main>

      {/* full-window drop overlay */}
      <div
        aria-hidden={!dragging}
        className={cn(
          "pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed border-primary bg-[#0a0a0a]/85 backdrop-blur-sm transition-opacity duration-150",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="wordmark text-4xl">Drop it</span>
      </div>
    </div>
  )
}
