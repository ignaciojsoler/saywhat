"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dropzone } from "./dropzone"
import { Editor } from "./editor"
import { Processing } from "./processing"
import { useAccount } from "@/components/account/account-provider"
import { OutOfCreditsError, transcribeFile } from "@/lib/pipeline"
import { useEditor } from "@/store/editor"

export function SaywhatApp() {
  const router = useRouter()
  const { account, setCredits } = useAccount()
  const phase = useEditor((s) => s.phase)
  const fileName = useEditor((s) => s.file?.name ?? "")
  const videoUrl = useEditor((s) => s.videoUrl)

  const outOfCredits = () =>
    toast.error("You're out of credits", {
      description: "Buy a pack to caption more videos.",
      action: { label: "Buy credits", onClick: () => router.push("/app/credits") },
    })

  const start = async (file: File) => {
    const { load, setPhase, setTranscript, reset } = useEditor.getState()
    if (!file.type.startsWith("video/")) {
      toast.error("That file isn't a video", { description: "Upload an MP4, MOV or WebM file." })
      return
    }
    if (account.credits <= 0) return outOfCredits()
    load(file)
    try {
      const { words, source, credits } = await transcribeFile(file, {
        onTranscribing: () => setPhase("transcribing"),
        onCredits: setCredits,
      })
      setTranscript(words, source)
      toast.success("Captions ready", { description: `1 credit used · ${credits} left` })
    } catch (e) {
      reset()
      if (e instanceof OutOfCreditsError) return outOfCredits()
      toast.error("Couldn't make captions", { description: (e as Error).message })
    }
  }

  if (phase === "ready") return <Editor />
  if (phase === "extracting" || phase === "transcribing") return <Processing phase={phase} fileName={fileName} videoUrl={videoUrl} />
  return <Dropzone onFile={start} />
}
