"use client"

import { useRef, useState } from "react"
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react"
import { ArrowRightIcon, PlayIcon } from "lucide-react"
import Link from "next/link"
import { CaptionDemo } from "@/components/saywhat/caption-demo"
import { Reveal } from "@/components/site/motion/reveal"
import { HeroDropzone } from "./hero-dropzone"
import { HeroTitle } from "./hero-title"
import { LiquidChrome } from "./liquid-chrome"
import { PhoneParallax } from "./phone-parallax"

/** Resting pose of the device; the pointer adds up to ±4° on top. */
const TILT = { x: 6, y: -14, z: 4 }

export function Hero() {
  const reduce = useReducedMotion()
  const [fine] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches)
  const follow = fine && !reduce

  const rx = useSpring(0, { stiffness: 70, damping: 18 })
  const ry = useSpring(0, { stiffness: 70, damping: 18 })
  const rotateX = useTransform(rx, (v) => TILT.x + v)
  const rotateY = useTransform(ry, (v) => TILT.y + v)
  const stageRef = useRef<HTMLDivElement>(null)

  const onMove = (e: React.PointerEvent) => {
    const el = stageRef.current
    if (!follow || !el) return
    const r = el.getBoundingClientRect()
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 8)
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 8)
  }
  const onLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  return (
    <section className="relative isolate overflow-hidden bg-black">
      {/* liquid chrome: right half on desktop, dimmed full-bleed behind the phone on mobile */}
      <LiquidChrome className="absolute inset-y-0 right-0 -z-10 hidden w-[62%] lg:block" />
      <LiquidChrome className="absolute inset-x-0 bottom-0 -z-10 h-[60%] lg:hidden" opacity={0.55} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "linear-gradient(90deg, #000 0%, #000 34%, transparent 62%), linear-gradient(0deg, #000 0%, transparent 18%)" }}
      />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-16 pb-20 sm:px-6 lg:min-h-[min(calc(100svh-64px),880px)] lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:py-20">
        <div className="flex min-w-0 flex-col gap-9">
          <Reveal>
            <p className="font-mono text-[0.7rem] tracking-[0.28em] text-white/55 uppercase">Word-by-word captions for vertical video</p>
          </Reveal>

          <div className="flex flex-col gap-7">
            <Reveal delay={0.08}>
              <HeroTitle />
            </Reveal>
            <Reveal delay={0.16}>
              <p className="max-w-[38ch] text-lg leading-relaxed text-pretty text-white/70">
                Drop in a clip. Saywhat transcribes it word by word and animates each line the way you like. Fix a word, pick a
                style, post it. That&apos;s the whole job.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.24} className="flex max-w-xl flex-col gap-5">
            <HeroDropzone />
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 pl-1 text-sm">
              <Link href="#how" className="group inline-flex items-center gap-2.5 text-white/80 transition-colors hover:text-white">
                <span className="grid size-7 place-items-center rounded-full border border-white/25 transition-colors group-hover:border-white/60">
                  <PlayIcon className="size-3 translate-x-px fill-current" />
                </span>
                See how it works
              </Link>
              <Link href="/signup" className="group inline-flex items-center gap-1.5 text-white/55 transition-colors hover:text-white">
                No clip handy? Start free
                <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>

        <div ref={stageRef} onPointerMove={onMove} onPointerLeave={onLeave} className="relative min-w-0">
          <PhoneParallax>
            <CaptionDemo
              chrome
              phoneClassName="w-[min(300px,74vw)] lg:w-[330px]"
              className="gap-8"
              frame={(phone) => (
                <div style={{ perspective: 1600 }}>
                  <motion.div style={{ rotateX, rotateY, rotateZ: TILT.z, transformStyle: "preserve-3d" }}>{phone}</motion.div>
                </div>
              )}
            />
          </PhoneParallax>
        </div>
      </div>
    </section>
  )
}
