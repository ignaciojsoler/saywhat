import { EditorDemo } from "./editor-demo"
import { RevealHeading } from "./reveal-heading"
import { Reveal } from "@/components/site/motion/reveal"
import { Stagger, StaggerItem } from "@/components/site/motion/stagger"

const POINTS = [
  ["Click a word, type over it.", "The timing stays put, so the caption still lands on the beat."],
  ["Click a timecode to jump there.", "The preview follows you, captions and all."],
  ["Ctrl+Z works.", "Because of course it should."],
]

export function EditSection() {
  return (
    <section id="editor" className="scroll-mt-16 border-b py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <Reveal>
              <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">The editor</p>
            </Reveal>
            <RevealHeading text="Typo at 0:12? Click it. Fix it. *Done.*" className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl" />
            <Reveal delay={0.1}>
              <p className="text-muted-foreground max-w-md text-lg leading-relaxed text-pretty">
                Speech-to-text is good, not psychic. When it hears &ldquo;Bethany&rdquo; instead of &ldquo;botany&rdquo;, you fix it
                like you&apos;d fix a doc. No keyframes, no subtitle tracks.
              </p>
            </Reveal>
          </div>
          <Stagger>
            <dl className="flex flex-col border-t">
              {POINTS.map(([dt, dd]) => (
                <StaggerItem as="div" key={dt} className="flex flex-col gap-0.5 border-b py-3.5">
                  <dt className="font-semibold">{dt}</dt>
                  <dd className="text-muted-foreground">{dd}</dd>
                </StaggerItem>
              ))}
            </dl>
          </Stagger>
        </div>
        <EditorDemo />
      </div>
    </section>
  )
}
