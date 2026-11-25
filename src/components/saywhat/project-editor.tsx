"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertTriangleIcon, CheckIcon, CloudOffIcon, FileVideoIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useAccount } from "@/components/account/account-provider"
import { Breadcrumbs } from "@/components/shell/page-header"
import { clock } from "@/lib/captions/formats"
import { formatBytes, getLocalIndex, getLocalVideo, makeThumbnail, readDuration, saveLocalVideo, saveThumbnail } from "@/lib/local-videos"
import type { ProjectData } from "@/lib/project-schema"
import { cn } from "@/lib/utils"
import { useEditor } from "@/store/editor"
import { Editor } from "./editor"
import { savedProjects, useAutosave, type SaveStatus } from "./use-autosave"

type Initial = Parameters<typeof useAutosave>[1]
type State = { kind: "loading" } | { kind: "relink" } | { kind: "ready"; initial: Initial }

/** Opens a saved project: transcript and style from the server, the video file from this device. */
export function ProjectEditor({ project }: { project: ProjectData }) {
  const { account } = useAccount()
  const storeId = useEditor((s) => s.projectId)

  // the freshest copy of the text data: this tab's last save, or the server props
  const source = () => {
    const local = savedProjects.get(project.id)
    return local && local.updatedAt > project.updatedAt ? { ...project, ...local } : project
  }

  const [state, setState] = useState<State>(() => {
    const s = useEditor.getState()
    // just uploaded: the store already holds this project and its file
    if (s.projectId === project.id && s.file && s.phase === "ready") {
      const p = source()
      // the server has the same transcript; its style may still be empty
      return { kind: "ready", initial: { words: s.words, style: p.style, aspect: p.aspect, title: p.title } }
    }
    return { kind: "loading" }
  })

  const open = (file: File) => {
    const p = source()
    useEditor.getState().hydrate({
      projectId: p.id,
      title: p.title,
      file,
      words: p.words,
      timingSource: p.timingSource,
      style: p.style,
      aspect: p.aspect,
    })
    // a saved style counts as saved once merged over the defaults; a missing one gets saved
    const style = p.style ? useEditor.getState().style : null
    setState({ kind: "ready", initial: { words: p.words, style, aspect: p.aspect, title: p.title } })
  }

  // Load the file from this device. Also runs when Next reveals this page again (back/forward)
  // after another project took over the editor store.
  useEffect(() => {
    if (state.kind === "relink" || (state.kind === "ready" && storeId === project.id)) return
    let cancelled = false
    getLocalVideo(project.id).then((file) => {
      if (cancelled) return
      if (file) open(file)
      else setState({ kind: "relink" })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, state.kind, storeId])

  if (state.kind === "loading" || (state.kind === "ready" && storeId !== project.id)) {
    return (
      <div className="grid h-[calc(100dvh-3.5rem)] place-items-center md:h-dvh">
        <Spinner className="text-muted-foreground size-5" />
      </div>
    )
  }
  if (state.kind === "relink") {
    return (
      <Relink
        project={project}
        onFile={async (file) => {
          const saved = await saveLocalVideo(account.id, project.id, file)
          if (saved === "quota") toast.warning("Your browser's storage is full", { description: "The video is open, but it won't be kept on this device." })
          const { thumbs } = await getLocalIndex()
          if (!thumbs.has(project.id)) void makeThumbnail(file).then((b) => b && saveThumbnail(account.id, project.id, b))
          open(file)
        }}
      />
    )
  }
  return <SavedEditor projectId={project.id} initial={state.initial} />
}

function SavedEditor({ projectId, initial }: { projectId: string; initial: Initial }) {
  const status = useAutosave(projectId, initial)
  return <Editor title={<TitleField savedTitle={initial.title} />} status={<SaveIndicator status={status} />} />
}

function TitleField({ savedTitle }: { savedTitle: string }) {
  const title = useEditor((s) => s.title)
  const setTitle = useEditor((s) => s.setTitle)
  const last = useRef(savedTitle)
  return (
    <input
      aria-label="Video title"
      value={title}
      maxLength={120}
      onChange={(e) => setTitle(e.target.value)}
      onFocus={() => (last.current = title)}
      onBlur={() => {
        if (!title.trim()) setTitle(last.current)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          if (e.key === "Escape") setTitle(last.current)
          e.currentTarget.blur()
        }
      }}
      className="hover:border-input focus-visible:border-ring focus-visible:ring-ring/30 h-8 max-w-[18rem] min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 text-sm font-medium outline-none focus-visible:ring-2 sm:max-w-sm"
    />
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <span role="status" aria-live="polite" className={cn("flex shrink-0 items-center gap-1 text-xs", status === "error" ? "text-destructive" : "text-muted-foreground")}>
      {status === "saving" ? (
        <>
          <Spinner className="size-3" />
          <span className="hidden sm:inline">Saving…</span>
        </>
      ) : status === "error" ? (
        <>
          <CloudOffIcon className="size-3.5" />
          <span className="hidden sm:inline">Not saved, retrying</span>
        </>
      ) : (
        <>
          <CheckIcon className="size-3.5" />
          <span className="hidden sm:inline">Saved</span>
        </>
      )}
    </span>
  )
}

/** The project's transcript is on the server but its video isn't on this device: ask for the original file. */
function Relink({ project, onFile }: { project: ProjectData; onFile: (f: File) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [mismatch, setMismatch] = useState<{ file: File; reasons: string[] } | null>(null)
  const [dragging, setDragging] = useState(false)

  const check = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("That file isn't a video", { description: "Select the original MP4, MOV or WebM file." })
      return
    }
    setBusy(true)
    const duration = await readDuration(file)
    const reasons: string[] = []
    const nameOk = file.name === project.fileName
    const sizeOk = !project.fileSize || file.size === project.fileSize
    const tolerance = Math.max(1.5, project.duration * 0.03)
    const durationOk = !project.duration || !duration || Math.abs(duration - project.duration) <= tolerance
    if (!durationOk) reasons.push(`It's ${clock(duration)} long; the original was ${clock(project.duration)}.`)
    if (!nameOk && !sizeOk) reasons.push(`The name and size differ from “${project.fileName}” (${formatBytes(project.fileSize)}).`)
    if (reasons.length) {
      setBusy(false)
      setMismatch({ file, reasons })
      return
    }
    await onFile(file)
  }

  const accept = async () => {
    if (!mismatch) return
    const f = mismatch.file
    setMismatch(null)
    setBusy(true)
    await onFile(f)
  }

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files?.[0]
        if (f) void check(f)
      }}
    >
      <header className="flex h-14 shrink-0 items-center border-b px-3 sm:px-4">
        <Breadcrumbs items={[{ label: "Videos", href: "/app" }, { label: project.title }]} />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Select the original video</h1>
          <p className="text-muted-foreground">
            Your captions are saved, but the video lives only on the device you uploaded it from. Pick the same file to keep editing here. It won&apos;t
            be uploaded.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className={cn(
            "focus-visible:ring-ring flex items-center gap-4 rounded-2xl border-2 border-dashed p-5 text-left transition-colors outline-none focus-visible:ring-2 disabled:opacity-60",
            dragging ? "border-primary bg-primary/[0.05]" : "border-foreground/20 hover:border-primary/60 hover:bg-primary/[0.04]",
          )}
        >
          <span className="bg-secondary grid size-12 shrink-0 place-items-center rounded-xl">
            {busy ? <Spinner className="size-5" /> : <FileVideoIcon className="size-5" />}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{project.fileName}</span>
            <span className="text-muted-foreground text-sm">
              {[project.fileSize ? formatBytes(project.fileSize) : null, project.duration ? clock(project.duration) : null].filter(Boolean).join(" · ")}
              {" · "}Click or drop the file here
            </span>
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (f) void check(f)
          }}
        />
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <ShieldCheckIcon className="size-4 shrink-0" />
          Saywhat never stores your video. It&apos;s kept in this browser so it opens instantly next time.
        </p>
      </main>

      <Dialog open={Boolean(mismatch)} onOpenChange={(o) => !o && setMismatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="text-primary size-4" />
              This may not be the same video
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-col gap-1.5">
                {mismatch?.reasons.map((r) => (
                  <p key={r}>{r}</p>
                ))}
                <p>If it&apos;s a different clip, the captions will be out of sync.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              className="h-9 px-3 text-sm"
              onClick={() => {
                setMismatch(null)
                input.current?.click()
              }}
            >
              Choose another file
            </Button>
            <Button className="h-9 px-3 text-sm" onClick={accept}>
              Use it anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
