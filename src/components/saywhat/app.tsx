"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Dropzone } from "./dropzone"
import { Processing } from "./processing"
import { useAccount } from "@/components/account/account-provider"
import { makeThumbnail, saveLocalVideo, saveThumbnail } from "@/lib/local-videos"
import { OutOfCreditsError, transcribeFile } from "@/lib/pipeline"
import { titleFromFileName } from "@/lib/project-schema"
import { useEditor } from "@/store/editor"

// a file dropped on the dashboard, picked up by the upload page it navigates to
let pendingFile: File | null = null
export const queueUpload = (f: File) => {
  pendingFile = f
}

/**
 * Upload → transcription → saved project. The video stays in this browser (IndexedDB);
 * the server keeps the transcript as a project, then we open its editor.
 */
export function UploadFlow({ showTips = true }: { showTips?: boolean }) {
  const router = useRouter()
  const { account, setCredits } = useAccount()
  const phase = useEditor((s) => s.phase)
  const projectId = useEditor((s) => s.projectId)
  const fileName = useEditor((s) => s.file?.name ?? "")
  const videoUrl = useEditor((s) => s.videoUrl)
  const visible = useRef(false)

  useEffect(() => {
    visible.current = true
    // an upload that finished or failed elsewhere leaves nothing to resume here
    const s = useEditor.getState()
    if (s.phase === "ready" || s.phase === "error") s.reset()
    return () => {
      visible.current = false
    }
  }, [])

  const outOfCredits = useCallback(
    () =>
      toast.error("You're out of credits", {
        description: "Buy a pack to caption more videos.",
        action: { label: "Buy credits", onClick: () => router.push("/app/credits") },
      }),
    [router],
  )

  const start = useCallback(
    async (file: File) => {
      const { load, setPhase, setTranscript, setProjectId, setTitle, reset, phase: current } = useEditor.getState()
      if (current === "extracting" || current === "transcribing") return
      if (!file.type.startsWith("video/")) {
        toast.error("That file isn't a video", { description: "Upload an MP4, MOV or WebM file." })
        return
      }
      if (account.credits <= 0) return outOfCredits()
      load(file)
      try {
        const { words, source, credits, projectId } = await transcribeFile(file, {
          onTranscribing: () => setPhase("transcribing"),
          onCredits: setCredits,
        })
        setTranscript(words, source)
        setProjectId(projectId)
        setTitle(titleFromFileName(file.name))

        const saved = await saveLocalVideo(account.id, projectId, file)
        if (saved !== "ok") {
          toast.warning("Couldn't keep a copy of this video on this device", {
            description:
              saved === "quota"
                ? "Your browser's storage is full. Captions are saved; next time you'll be asked to select the file again."
                : "Captions are saved; next time you'll be asked to select the file again.",
          })
        }
        void makeThumbnail(file).then((b) => b && saveThumbnail(account.id, projectId, b))

        const href = `/app/videos/${projectId}`
        router.refresh()
        if (visible.current) {
          toast.success("Captions ready", { description: `1 credit used · ${credits} left` })
          router.push(href)
        } else {
          toast.success("Captions ready", {
            description: `${file.name} · ${credits} credits left`,
            action: { label: "Open", onClick: () => router.push(href) },
          })
        }
      } catch (e) {
        reset()
        if (e instanceof OutOfCreditsError) return outOfCredits()
        toast.error("Couldn't make captions", { description: (e as Error).message })
      }
    },
    [account.credits, account.id, outOfCredits, router, setCredits],
  )

  useEffect(() => {
    const f = pendingFile
    pendingFile = null
    if (f) void start(f)
  }, [start])

  const busy = phase === "extracting" || phase === "transcribing" || (phase === "ready" && projectId)
  if (busy) return <Processing phase={phase} fileName={fileName} videoUrl={videoUrl} />
  return <Dropzone onFile={start} showTips={showTips} />
}
