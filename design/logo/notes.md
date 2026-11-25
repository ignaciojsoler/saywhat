# Saywhat logo exploration

Brief: a mark that reads at 16 px, works in one color, and says "each word lights up as it's spoken".
Palette: ink `#0A0A0A`, white `#FAFAFA`, caption yellow `#FFE14D` (only accent).

## Concepts

| File | Idea | Verdict |
| --- | --- | --- |
| `concept-a-caption-block.svg` | Two caption lines, first word of line 2 highlighted | Literal and clear large, but at 16 px it is four blobs; no letter, no memorability. |
| `concept-b-bubble.svg` | Yellow speech bubble with a caption bar knocked out | Reads as a generic chat/messaging icon; too close to many existing apps. |
| `concept-c-s-lines.svg`, `concept-c2-s-lines-gapped.svg` | "S" drawn as one stroke, middle segment yellow | Reads as an S at 16 px, but the highlight is tiny and overlapping caps look sloppy. |
| `concept-d-pop-word.svg` | Three words in a row, the middle one bigger and yellow ("the word that pops") | Nice idea, works in mono, but abstract and weak as a favicon (reads as a dot). |
| `concept-c4-…`, `concept-c7-s-caption-stack-final.svg` | **Chosen.** An "S" built from two caption lines (top and bottom) with the middle stroke replaced by the highlighted word | See below. |

## Why C7

- It is a letter (S for Saywhat) and a caption at the same time: three stacked lines where the middle
  word is lit up, exactly what the product does.
- Holds up at 16 px: three bars plus two corners. The favicon uses a pixel-snapped 16-grid redraw
  (`src/app/icon.svg`) so every edge lands on a pixel.
- One color works: the gaps around the middle bar keep the S and the "word" readable without yellow
  (`public/brand/*-mono.svg`).
- On light backgrounds the yellow word gets a thin ink outline, echoing the black stroke of caption text
  (`public/brand/logo-light.svg`).

## Wordmark

"Saywhat" in Montserrat 900 (the caption font), -0.02 em tracking, converted to paths with opentype.js
(`generate.mjs`), so no font is needed at runtime. Caps are vertically centred on the mark.

## Sheets

- `sheet-1-concepts.png`: concepts A–D at 16/24/32/64/160 px on dark and light.
- `sheet-2-c-iterations.png`: S-from-caption-lines iterations (C5–C7).
- `sheet-3-final-lockups.png`: final lockups (dark, light, mono) and the app icon tile.
- `sheet-4-favicon-16-32-zoom.png`: favicon at 16 and 32 px, nearest-neighbour zoom.
