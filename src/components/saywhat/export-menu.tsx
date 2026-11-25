"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { ChevronDownIcon, DownloadIcon, FileTextIcon, FilmIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { toSRT, toVTT } from "@/lib/captions/formats"
import { download, exportVideo } from "@/lib/export-video"
import { useEditor } from "@/store/editor"
import { usePlayer } from "@/store/player"

const baseName = (title: string, f: File | null) =>
  (title || (f?.name ?? "video").replace(/\.[^.]+$/, "")).replace(/[\\/:*?"<>|]+/g, "-").trim() || "video"

/** Records the export on the saved project (shown on the dashboard). Best effort. */
function markExported() {
  const id = useEditor.getState().projectId
  if (!id) return
  void fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exported: true }),
  }).catch(() => {})
}

export function ExportMenu() {
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const exportText = (kind: "srt" | "vtt") => {
    const { words, lines, file, title } = useEditor.getState()
    const text = kind === "srt" ? toSRT(words, lines) : toVTT(words, lines)
    download(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName(title, file)}.${kind}`)
    markExported()
  }

  const exportMp4 = async () => {
    const { words, lines, style, aspect, videoUrl, file, title } = useEditor.getState()
    if (!videoUrl) return
    usePlayer.getState().video?.pause()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true)
    const id = toast.loading("Exporting video… 0%", {
      description: "Keep this tab open until it finishes.",
      action: { label: "Cancel", onClick: () => ctrl.abort() },
      duration: Infinity,
    })
    try {
      let last = -1
      const { blob, ext } = await exportVideo({
        url: videoUrl,
        words,
        lines,
        style,
        aspect,
        signal: ctrl.signal,
        onProgress: (p) => {
          const pct = Math.floor(p * 100)
          if (pct !== last) {
            last = pct
            toast.loading(`Exporting video… ${pct}%`, { id })
          }
        },
      })
      download(blob, `${baseName(title, file)}-saywhat.${ext}`)
      markExported()
      toast.success("Video exported", { id, description: `Saved as .${ext}`, action: undefined, duration: 4000 })
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError"
      toast[aborted ? "info" : "error"](aborted ? "Export canceled" : "Couldn't export the video", {
        id,
        description: aborted ? undefined : (e as Error).message,
        action: undefined,
        duration: 4000,
      })
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={busy}>
          {busy ? <Spinner /> : <DownloadIcon />}
          Export
          <ChevronDownIcon className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Export</DropdownMenuLabel>
        <DropdownMenuItem onSelect={exportMp4}>
          <FilmIcon />
          Video with captions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => exportText("srt")}>
          <FileTextIcon />
          Subtitles (.srt)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportText("vtt")}>
          <FileTextIcon />
          Subtitles (.vtt)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
