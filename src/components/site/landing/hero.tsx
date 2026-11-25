import { CaptionDemo } from "@/components/saywhat/caption-demo"
import { FREE_CREDITS } from "@/lib/billing/packs"
import { HeroTitle } from "./hero-title"
import { Reveal } from "@/components/site/motion/reveal"
import { HeroBg } from "./hero-bg"
import { PhoneParallax } from "./phone-parallax"
import { CtaCard } from "./cta-card"

export function Hero() {
  return (
    <section className="screen relative overflow-hidden border-b border-white/10">
      <HeroBg />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-14 pb-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:gap-16 lg:pt-20 lg:pb-24">
        <div className="flex max-w-xl flex-col gap-8">
          <Reveal delay={0}>
            <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">Word-by-word captions for vertical video</p>
          </Reveal>

          <div className="flex flex-col gap-6">
            <Reveal delay={0.1}>
              <HeroTitle />
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-muted-foreground max-w-md text-lg leading-relaxed text-pretty">
                Drop in a clip. Saywhat transcribes it word by word and animates each line the way you like. Fix a word, pick a
                style, post it. That&apos;s the whole job.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.3}>
            <CtaCard />
          </Reveal>
          <Reveal delay={0.4}>
            <p className="text-muted-foreground font-mono text-xs">
              {FREE_CREDITS} free videos · no card · your video stays on your device
            </p>
          </Reveal>
        </div>

        <PhoneParallax>
          <CaptionDemo />
        </PhoneParallax>
      </div>
    </section>
  )
}
