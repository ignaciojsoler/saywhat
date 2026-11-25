"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CoinsIcon, FilmIcon, PlayIcon, ShieldCheckIcon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccount } from "@/components/account/account-provider"
import { PACKS } from "@/lib/billing/packs"
import { cn } from "@/lib/utils"
import { MAX_SECONDS } from "@/lib/pipeline"

/** Smallest pack on sale, so the no-credits copy can never advertise a stale number. */
const MIN_PACK_CREDITS = Math.min(...PACKS.map((p) => p.credits))

// optional sample clip for the "Try the sample" button: drop one of these into /public
const SAMPLE_URLS = ["/sample.mp4", "/sample.webm"]

const TIPS = [
  "Clear speech close to the mic gives the best timing.",
  "Vertical 9:16 clips look best on Reels, TikTok and Shorts.",
  "You can fix any word after transcription. Timing stays in sync.",
]

/** Upload area. While it's on screen the whole window is a drop target. */
export function Dropzone({ onFile, showTips = true }: { onFile: (f: File) => void; showTips?: boolean }) {
  const { account } = useAccount()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [sampleUrl, setSampleUrl] = useState<string | null>(null)
  const empty = account.credits <= 0

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
      setDragging(false)
    }
  }, [onFile])

  const trySample = async () => {
    if (!sampleUrl) return
    const blob = await (await fetch(sampleUrl)).blob()
    onFile(new File([blob], sampleUrl.slice(1), { type: blob.type || "video/mp4" }))
  }

  return (
    <div className="flex flex-col gap-6">
      {empty ? (
        <div className="bg-card flex flex-col items-center gap-5 rounded-2xl border px-6 py-12 text-center">
          <span className="bg-primary/12 text-primary grid size-14 place-items-center rounded-2xl">
            <CoinsIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold">No credits left</h2>
            <p className="text-muted-foreground max-w-sm">Packs start at {MIN_PACK_CREDITS} videos. Pay with card or Mercado Pago, credits arrive instantly.</p>
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
            "group focus-visible:ring-ring flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors outline-none focus-visible:ring-2",
            "hover:border-primary/60 hover:bg-primary/[0.04] border-foreground/20",
          )}
        >
          <span className="bg-primary text-primary-foreground grid size-14 place-items-center rounded-2xl transition-transform group-hover:-translate-y-0.5">
            <UploadIcon className="size-6" />
          </span>
          <span className="flex flex-col gap-1.5">
            <span className="text-xl font-semibold">Drop a video or click to upload</span>
            <span className="text-muted-foreground">MP4, MOV or WebM, up to {MAX_SECONDS / 60} minutes · 1 credit</span>
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <ShieldCheckIcon className="size-3.5" />
            Your video stays on this device. Only the audio is sent for transcription.
          </span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) onFile(f)
        }}
      />

      {(showTips || (sampleUrl && !empty)) && (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {showTips ? (
            <ul className="flex flex-col gap-2.5">
              {TIPS.map((t) => (
                <li key={t} className="text-muted-foreground flex items-start gap-2.5 text-sm">
                  <FilmIcon className="text-foreground/60 mt-0.5 size-3.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <span />
          )}
          {sampleUrl && !empty && (
            <Button variant="outline" onClick={trySample} className="h-9 shrink-0 px-3 text-sm">
              <PlayIcon />
              Try the sample
            </Button>
          )}
        </div>
      )}

      {/* full-window drop overlay */}
      <div
        aria-hidden={!dragging}
        className={cn(
          "border-primary pointer-events-none fixed inset-3 z-50 grid place-items-center rounded-3xl border-2 border-dashed bg-[#0a0a0a]/85 backdrop-blur-sm transition-opacity duration-150",
          dragging ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="wordmark text-4xl">Drop it</span>
      </div>
    </div>
  )
}
