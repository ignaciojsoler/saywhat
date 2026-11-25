"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { UploadIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"
import { MAX_SECONDS } from "@/lib/pipeline"
import { readDuration, savePendingUpload } from "@/lib/local-videos"
import { queueUpload } from "@/components/saywhat/app"
import { FREE_CREDITS } from "@/lib/billing/packs"
import { cn } from "@/lib/utils"

const MAX_BYTES = 500 * 1024 * 1024
const NEXT_PATH = "/app/new?pending=1"

function formatDuration(s: number) {
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`
}

export function HeroDropzone() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const inputRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<string | null>(null)

  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function handleFile(f: File) {
    setError(null)
    if (!f.type.startsWith("video/")) {
      setError("That file isn't a video. Upload an MP4, MOV or WebM file.")
      return
    }
    if (f.size > MAX_BYTES) {
      setError("That file is too large. The limit is 500 MB.")
      return
    }
    const d = await readDuration(f)
    if (d > MAX_SECONDS) {
      setError(`This video is ${Math.round(d)} s long. The limit is ${MAX_SECONDS / 60} minutes.`)
      return
    }

    await savePendingUpload(f)

    if (session) {
      queueUpload(f)
      router.push("/app/new?pending=1")
      return
    }

    const u = URL.createObjectURL(f)
    urlRef.current = u
    setPreviewUrl(u)
    setFile(f)
    setDuration(d)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setPreviewUrl(null)
    setFile(null)
  }

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files?.[0]
        if (f) void handleFile(f)
      }}
      className={cn(
        "relative group rounded-2xl border p-2 pl-5 backdrop-blur-md transition-colors flex items-center gap-4",
        dragging ? "border-white/50 bg-white/[0.07]" : "border-white/15 bg-white/[0.04] hover:border-white/35",
      )}
    >
      <div className="flex items-center gap-3">
        <UploadIcon className="size-5 text-white/70" />
        <div className="flex flex-col">
          <span className="font-semibold text-white">Drop your video here</span>
          <span className="text-sm text-white/60">MP4, MOV or WebM</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="ml-auto inline-flex h-12 items-center justify-center rounded-full bg-white px-7 font-semibold text-black transition hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
      >
        Upload video
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) void handleFile(f)
        }}
      />
      {error && <p className="absolute -bottom-6 left-0 text-sm text-red-300">{error}</p>}

      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="border-white/15 bg-white/[0.06] text-white backdrop-blur-md">
          <DialogHeader>
            <DialogTitle>Your clip is ready to caption</DialogTitle>
            <DialogDescription className="text-white/70">
              Create a free account to generate the captions. Your first {FREE_CREDITS} videos are free.
            </DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <div className="mx-auto aspect-[9/16] max-h-[46vh] overflow-hidden rounded-xl">
              <video src={previewUrl} muted autoPlay loop playsInline className="size-full object-cover" />
            </div>
          )}
          {file && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-white/80">{file.name}</span>
              <span className="shrink-0 tabular-nums text-white/60">{formatDuration(duration)}</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Link
              href={`/signup?next=${encodeURIComponent(NEXT_PATH)}`}
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-7 font-semibold text-black transition hover:shadow-[0_0_40px_rgba(255,255,255,0.25)]"
            >
              Create free account
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(NEXT_PATH)}`}
              className="text-center text-sm text-white/60 underline-offset-4 hover:underline"
            >
              I already have an account
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}