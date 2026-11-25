import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { CaptionDemo } from "@/components/saywhat/caption-demo"
import { FREE_CREDITS } from "@/lib/billing/packs"
import { MAX_SECONDS } from "@/lib/pipeline"
import { HeroTitle } from "./hero-title"

export function Hero() {
  return (
    <section className="screen border-b border-white/10">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-14 pb-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-16 lg:pt-20 lg:pb-24">
        <div className="flex max-w-xl flex-col gap-8">
          <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">Word-by-word captions for vertical video</p>

          <div className="flex flex-col gap-6">
            <HeroTitle />
            <p className="text-muted-foreground max-w-md text-lg leading-relaxed text-pretty">
              Drop in a clip. Saywhat transcribes it word by word and animates each line the way you like. Fix a word, pick a
              style, post it. That&apos;s the whole job.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/signup"
              className="group focus-visible:ring-ring flex items-center gap-4 rounded-lg border border-dashed border-white/25 p-4 transition-colors outline-none hover:border-[var(--caption)] hover:bg-white/[0.03] focus-visible:ring-2 sm:p-5"
            >
              <span aria-hidden className="grid h-14 w-10 shrink-0 place-items-center rounded-[5px] border border-white/20 font-mono text-xs text-white/75">
                9:16
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-lg font-semibold tracking-tight">Drop a video</span>
                <span className="text-muted-foreground text-sm">
                  MP4, MOV or WebM · up to {MAX_SECONDS / 60} min
                </span>
              </span>
              <span className="bg-primary text-primary-foreground inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3.5 text-sm font-semibold">
                <span className="hidden sm:inline">Start free</span>
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
            <p className="text-muted-foreground font-mono text-xs">
              {FREE_CREDITS} free videos · no card · your video stays on your device
            </p>
          </div>
        </div>

        <CaptionDemo />
      </div>
    </section>
  )
}
