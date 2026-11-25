"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react"
import { toast } from "sonner"
import {
  CopyIcon,
  FilmIcon,
  LayoutGridIcon,
  ListIcon,
  MonitorOffIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useAccount } from "@/components/account/account-provider"
import { UploadFlow, queueUpload } from "@/components/saywhat/app"
import { deleteVideo, duplicateVideo, renameVideo } from "@/app/app/videos/actions"
import { emptyStateCopy } from "@/lib/empty-state-copy"
import { copyLocalVideo, deleteLocalVideo, getLocalIndex } from "@/lib/local-videos"
import type { ProjectSummary } from "@/lib/project-schema"
import { cn } from "@/lib/utils"

type Sort = "edited" | "created" | "title"
type View = "grid" | "list"
const VIEW_KEY = "saywhat.videos.view"

const SORTS: Record<Sort, { label: string; fn: (a: ProjectSummary, b: ProjectSummary) => number }> = {
  edited: { label: "Last edited", fn: (a, b) => b.updatedAt - a.updatedAt },
  created: { label: "Date created", fn: (a, b) => b.createdAt - a.createdAt },
  title: { label: "Name", fn: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }) },
}

export const duration = (s: number) => {
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`
}

const ASPECT_LABEL: Record<string, string> = { original: "Original", "9:16": "9:16", "1:1": "1:1", "16:9": "16:9" }

/** Current time on the client, refreshed every minute; null during server render and hydration. */
const noop = () => () => {}
function useNow(): number | null {
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  )
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return mounted ? now : null
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const dateFmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" })
function relative(t: number, now: number) {
  const s = Math.round((t - now) / 1000)
  const abs = Math.abs(s)
  if (abs < 45) return "just now"
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour")
  if (abs < 86400 * 7) return rtf.format(Math.round(s / 86400), "day")
  return dateFmt.format(t)
}

type LocalIndex = { files: Set<string>; thumbs: Map<string, string> }

/** Which videos are on this device, with object URLs for their thumbnails. */
function useLocalIndex(ids: string): LocalIndex | null {
  const [index, setIndex] = useState<LocalIndex | null>(null)
  useEffect(() => {
    let cancelled = false
    let urls: string[] = []
    getLocalIndex().then(({ files, thumbs }) => {
      if (cancelled) return
      const map = new Map<string, string>()
      for (const [id, blob] of thumbs) map.set(id, URL.createObjectURL(blob))
      urls = [...map.values()]
      setIndex({ files, thumbs: map })
    })
    return () => {
      cancelled = true
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [ids])
  return index
}

/** Grid or list, remembered in this browser (a per-viewer convenience). */
function useView(): [View, (v: View) => void] {
  const view = useSyncExternalStore(
    (cb) => {
      window.addEventListener(VIEW_KEY, cb)
      return () => window.removeEventListener(VIEW_KEY, cb)
    },
    (): View => {
      try {
        return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"
      } catch {
        return "grid"
      }
    },
    (): View => "grid",
  )
  const set = (v: View) => {
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {}
    window.dispatchEvent(new Event(VIEW_KEY))
  }
  return [view, set]
}

export function VideosDashboard({
  projects,
  hasSpent,
  hasPurchased,
}: {
  projects: ProjectSummary[]
  hasSpent: boolean
  hasPurchased: boolean
}) {
  const router = useRouter()
  const { account } = useAccount()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<Sort>("edited")
  const [view, setView] = useView()

  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [renamed, setRenamed] = useState<Map<string, string>>(new Map())
  const [renaming, setRenaming] = useState<ProjectSummary | null>(null)
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null)
  const [busy, startTransition] = useTransition()
  const now = useNow()

  const all = useMemo(
    () => projects.filter((p) => !removed.has(p.id)).map((p) => (renamed.has(p.id) ? { ...p, title: renamed.get(p.id)! } : p)),
    [projects, removed, renamed],
  )
  const local = useLocalIndex(all.map((p) => p.id).join(","))
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter((p) => !q || p.title.toLowerCase().includes(q) || p.fileName.toLowerCase().includes(q)).sort(SORTS[sort].fn)
  }, [all, query, sort])

  if (all.length === 0) return <EmptyState credits={account.credits} hasSpent={hasSpent} hasPurchased={hasPurchased} />

  const duplicate = (p: ProjectSummary) =>
    startTransition(async () => {
      const r = await duplicateVideo(p.id)
      if (!r.ok) return void toast.error("Couldn't duplicate", { description: r.error })
      await copyLocalVideo(account.id, p.id, r.id)
      toast.success("Video duplicated", { description: "No credit used." })
      router.refresh()
    })

  return (
    <div className="flex flex-col gap-5">
      <QuickUpload />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos"
            aria-label="Search videos by title"
            className="h-9 pl-9 text-base md:text-sm"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-muted-foreground text-sm whitespace-nowrap" id="sort-label">
            Sort by
          </span>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger aria-labelledby="sort-label" className="h-9 min-w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORTS) as Sort[]).map((k) => (
                <SelectItem key={k} value={k} className="text-sm">
                  {SORTS[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v as View)} aria-label="Layout" className="ml-auto sm:ml-0">
            <ToggleGroupItem value="grid" aria-label="Grid view" className="size-9">
              <LayoutGridIcon className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="size-9">
              <ListIcon className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="text-muted-foreground rounded-2xl border border-dashed px-6 py-14 text-center">
          No videos match “{query}”.{" "}
          <button type="button" onClick={() => setQuery("")} className="text-foreground underline underline-offset-4">
            Clear search
          </button>
        </div>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-x-5 gap-y-7 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id}>
              <VideoCard
                p={p}
                thumb={local?.thumbs.get(p.id)}
                onDevice={local ? local.files.has(p.id) : null}
                now={now}
                menu={<RowMenu onRename={() => setRenaming(p)} onDuplicate={() => duplicate(p)} onDelete={() => setDeleting(p)} href={`/app/videos/${p.id}`} disabled={busy} />}
              />
            </li>
          ))}
        </ul>
      ) : (
        <VideoTable
          rows={shown}
          local={local}
          now={now}
          menu={(p) => <RowMenu onRename={() => setRenaming(p)} onDuplicate={() => duplicate(p)} onDelete={() => setDeleting(p)} href={`/app/videos/${p.id}`} disabled={busy} />}
        />
      )}

      <RenameDialog
        project={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={(id, title) => {
          setRenamed((m) => new Map(m).set(id, title))
          router.refresh()
        }}
      />
      <DeleteDialog
        project={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          setRemoved((s) => new Set(s).add(id))
          router.refresh()
        }}
      />
    </div>
  )
}

function EmptyState({ credits, hasSpent, hasPurchased }: { credits: number; hasSpent: boolean; hasPurchased: boolean }) {
  const { title, body } = emptyStateCopy({ credits, hasSpent, hasPurchased })
  return (
    <section className="flex flex-col gap-6" aria-labelledby="empty-title">
      <div className="flex flex-col gap-1.5">
        <h2 id="empty-title" className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-muted-foreground">{body}</p>
      </div>
      <UploadFlow />
    </section>
  )
}

/** Compact upload entry above the library, like the upload box on Opus Clip or Submagic home screens. */
function QuickUpload() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const go = (f: File) => {
    queueUpload(f)
    router.push("/app/new")
  }
  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) go(f)
      }}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center sm:gap-4",
        over ? "border-primary bg-primary/[0.06]" : "border-foreground/20 bg-white/[0.015]",
      )}
    >
      <span className="bg-primary text-primary-foreground hidden size-10 shrink-0 place-items-center rounded-xl sm:grid">
        <UploadIcon className="size-4.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">Drop a video here to caption it</span>
        <span className="text-muted-foreground text-sm">MP4, MOV or WebM up to 2 minutes · 1 credit · the video stays on this device</span>
      </div>
      <Button variant="secondary" className="h-9 px-3 text-sm" onClick={() => input.current?.click()}>
        <UploadIcon />
        Upload
      </Button>
      <input
        ref={input}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) go(f)
        }}
      />
    </div>
  )
}

function Thumb({ src, title, className }: { src?: string; title: string; className?: string }) {
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-[#1c1c1c]", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-contain" />
      ) : (
        <FilmIcon className="text-muted-foreground size-6" aria-hidden />
      )}
      <span className="sr-only">{title}</span>
    </div>
  )
}

function OffDeviceBadge({ compact }: { compact?: boolean }) {
  return (
    <span
      title="The video file isn't stored in this browser. You'll be asked to select it when you open the project."
      className="inline-flex items-center gap-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white ring-1 ring-white/15"
    >
      <MonitorOffIcon className="size-3" />
      {compact ? "Not here" : "Not on this device"}
    </span>
  )
}

function VideoCard({
  p,
  thumb,
  onDevice,
  now,
  menu,
}: {
  p: ProjectSummary
  thumb?: string
  onDevice: boolean | null
  now: number | null
  menu: React.ReactNode
}) {
  const href = `/app/videos/${p.id}`
  return (
    <article className="group relative flex flex-col gap-2.5">
      <div className="relative">
        <Thumb src={thumb} title={p.title} className="aspect-video rounded-xl ring-1 ring-white/10 transition group-hover:ring-white/25" />
        {onDevice === false && (
          <span className="absolute top-2 left-2">
            <OffDeviceBadge />
          </span>
        )}
        {p.duration > 0 && (
          <span className="absolute right-2 bottom-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
            {duration(p.duration)}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="truncate text-sm font-medium">
            <Link href={href} className="focus-visible:ring-ring rounded-sm outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:ring-2">
              {p.title}
            </Link>
          </h3>
          <p className="text-muted-foreground truncate text-xs">
            {now ? `Edited ${relative(p.updatedAt, now)}` : " "}
            {` · ${ASPECT_LABEL[p.aspect] ?? p.aspect}`}
            {p.lastExportedAt ? " · Exported" : ""}
          </p>
        </div>
        <div className="relative z-10">{menu}</div>
      </div>
    </article>
  )
}

function VideoTable({
  rows,
  local,
  now,
  menu,
}: {
  rows: ProjectSummary[]
  local: LocalIndex | null
  now: number | null
  menu: (p: ProjectSummary) => React.ReactNode
}) {
  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs">
          <tr>
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Length</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell">Format</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Edited</th>
            <th className="w-12 px-2 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((p) => (
            <tr key={p.id} className="relative transition-colors hover:bg-white/[0.03]">
              <td className="max-w-0 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Thumb src={local?.thumbs.get(p.id)} title={p.title} className="h-10 w-16 shrink-0 rounded-md ring-1 ring-white/10" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      href={`/app/videos/${p.id}`}
                      className="focus-visible:ring-ring truncate rounded-sm font-medium outline-none after:absolute after:inset-0 focus-visible:ring-2"
                    >
                      {p.title}
                    </Link>
                    {local && !local.files.has(p.id) && (
                      <span>
                        <OffDeviceBadge compact />
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-muted-foreground hidden px-3 py-2.5 tabular-nums sm:table-cell">{p.duration ? duration(p.duration) : "–"}</td>
              <td className="text-muted-foreground hidden px-3 py-2.5 md:table-cell">{ASPECT_LABEL[p.aspect] ?? p.aspect}</td>
              <td className="text-muted-foreground hidden px-3 py-2.5 whitespace-nowrap sm:table-cell">{now ? relative(p.updatedAt, now) : ""}</td>
              <td className="relative z-10 px-2 py-2.5 text-right">{menu(p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RowMenu({
  href,
  onRename,
  onDuplicate,
  onDelete,
  disabled,
}: {
  href: string
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  const item = (Icon: LucideIcon, label: string, onSelect: () => void, destructive?: boolean) => (
    <DropdownMenuItem onSelect={onSelect} variant={destructive ? "destructive" : "default"} className="text-sm">
      <Icon />
      {label}
    </DropdownMenuItem>
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-8 rounded-md p-0" aria-label="Video actions" disabled={disabled}>
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild className="text-sm">
          <Link href={href}>
            <FilmIcon />
            Open
          </Link>
        </DropdownMenuItem>
        {item(PencilIcon, "Rename", onRename)}
        {item(CopyIcon, "Duplicate", onDuplicate)}
        <DropdownMenuSeparator />
        {item(Trash2Icon, "Delete", onDelete, true)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RenameDialog({ project, onClose, onRenamed }: { project: ProjectSummary | null; onClose: () => void; onRenamed: (id: string, title: string) => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog
      open={Boolean(project)}
      onOpenChange={(o) => {
        if (!o) {
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          action={(form) => {
            if (!project) return
            const title = String(form.get("title") ?? "")
            startTransition(async () => {
              const r = await renameVideo(project.id, title)
              if (!r.ok) return setError(r.error)
              onRenamed(project.id, r.title)
              setError(null)
              onClose()
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename video</DialogTitle>
            <DialogDescription>Only the name in Saywhat changes, not your file.</DialogDescription>
          </DialogHeader>
          <Input
            key={project?.id}
            name="title"
            defaultValue={project?.title}
            maxLength={120}
            required
            autoFocus
            aria-label="Video name"
            aria-invalid={Boolean(error) || undefined}
            className="h-10 text-sm md:text-sm"
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" className="h-9 px-3 text-sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="h-9 px-3 text-sm" disabled={pending}>
              {pending && <Spinner />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({ project, onClose, onDeleted }: { project: ProjectSummary | null; onClose: () => void; onDeleted: (id: string) => void }) {
  const [pending, startTransition] = useTransition()
  const confirm = () => {
    if (!project) return
    startTransition(async () => {
      const r = await deleteVideo(project.id)
      if (!r.ok) {
        toast.error("Couldn't delete", { description: r.error })
        return
      }
      await deleteLocalVideo(project.id)
      onDeleted(project.id)
      onClose()
      toast.success("Video deleted")
    })
  }
  return (
    <Dialog open={Boolean(project)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{project?.title}”?</DialogTitle>
          <DialogDescription>
            This deletes its captions and edits for good, and removes the copy of the video stored in this browser. Your original file isn&apos;t touched.
            The credit it used isn&apos;t refunded.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" className="h-9 px-3 text-sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" className="h-9 px-3 text-sm" onClick={confirm} disabled={pending}>
            {pending && <Spinner />}
            Delete video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
