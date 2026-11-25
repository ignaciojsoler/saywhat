import type { Word } from "./types"

/** Demo clip used on the marketing site (480x270, ~15 s, muted by default). */
export const SAMPLE_SRC = "/sample.webm"
export const SAMPLE_DURATION = 15

/** Real word-level transcript of {@link SAMPLE_SRC}, as returned by the transcription pipeline. */
export const SAMPLE_WORDS: Word[] = [
  { w: "I", s: 0, e: 0.18 },
  { w: "like", s: 0.18, e: 0.3 },
  { w: "the", s: 0.3, e: 0.48 },
  { w: "feeling", s: 0.48, e: 0.8 },
  { w: "when", s: 0.8, e: 1.22 },
  { w: "I'm", s: 1.22, e: 1.42 },
  { w: "staying", s: 1.42, e: 1.66 },
  { w: "in", s: 1.66, e: 1.86 },
  { w: "the", s: 1.86, e: 1.92 },
  { w: "forest,", s: 1.92, e: 2.78 },
  { w: "it's", s: 2.78, e: 2.92 },
  { w: "quiet,", s: 2.92, e: 3.98 },
  { w: "you", s: 3.98, e: 4.44 },
  { w: "can", s: 4.44, e: 4.66 },
  { w: "listen", s: 4.66, e: 5.22 },
  { w: "to", s: 5.22, e: 6.94 },
  { w: "the", s: 6.94, e: 7.04 },
  { w: "birds,", s: 7.04, e: 8.02 },
  { w: "to", s: 8.02, e: 8.1 },
  { w: "the", s: 8.1, e: 8.22 },
  { w: "trees,", s: 8.22, e: 10 },
  { w: "I", s: 10, e: 10.16 },
  { w: "got", s: 10.16, e: 10.26 },
  { w: "my", s: 10.26, e: 10.44 },
  { w: "degree", s: 10.44, e: 10.82 },
  { w: "in", s: 10.82, e: 11.12 },
  { w: "botany.", s: 11.12, e: 12.14 },
  { w: "If", s: 12.32, e: 12.56 },
  { w: "I'm", s: 12.56, e: 12.74 },
  { w: "not", s: 12.74, e: 12.86 },
  { w: "taking", s: 12.86, e: 13.58 },
  { w: "botany,", s: 13.58, e: 14.98 },
]

/** `00:03.42`-style timecode (minutes:seconds.hundredths). */
export function timecode(t: number) {
  const v = Math.max(0, t)
  const m = Math.floor(v / 60)
  const s = v - m * 60
  return `${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`
}
