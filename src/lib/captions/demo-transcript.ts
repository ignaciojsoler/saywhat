import type { Word } from "./types"

/**
 * Captions for the landing demo clip (public/demo-clip.mp4): two creators talking to camera,
 * built from Pexels footage (see video/script.md). The clip is silent, so the lines are
 * invented; each sentence is spread over the moment the speaker is actually talking.
 */
const SENTENCES: { s: number; e: number; text: string }[] = [
  // first creator, 0 - 12 s
  { s: 0.3, e: 2.9, text: "I posted every single day for thirty days." },
  { s: 3.2, e: 5.6, text: "Same camera, same room, same face." },
  { s: 6.0, e: 7.6, text: "Views went nowhere." },
  { s: 8.0, e: 11.6, text: "Then I added captions to every single clip." },
  // second creator, 12 - 20.5 s
  { s: 12.4, e: 14.3, text: "And people actually stayed." },
  { s: 14.6, e: 16.7, text: "Watch time doubled in a week." },
  { s: 17.0, e: 20.2, text: "Honestly, I'm never posting without them again." },
]

/** Spread a sentence's words over its span, weighted by length, with a beat after commas. */
function timeSentence({ s, e, text }: (typeof SENTENCES)[number]): Word[] {
  const words = text.split(" ")
  const weight = (w: string) => 1 + w.replace(/[^\p{L}\p{N}]/gu, "").length * 0.18 + (/,$/.test(w) ? 0.7 : 0)
  const total = words.reduce((a, w) => a + weight(w), 0)
  let t = s
  return words.map((w) => {
    const d = ((e - s) * weight(w)) / total
    const word = { w, s: round(t), e: round(t + d * (/,$/.test(w) ? 0.7 : 0.92)) }
    t += d
    return word
  })
}

const round = (x: number) => Math.round(x * 100) / 100

export const DEMO_CLIP_WORDS: Word[] = SENTENCES.flatMap(timeSentence)

/** Length of the demo clip, in seconds. */
export const DEMO_CLIP_DURATION = 20.5
