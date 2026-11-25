# Saywhat promo: voiceover script

Format: vertical 1080x1920, 30 fps, about 26 s. Creator tone, fast but clear.
Voice: Kokoro TTS (`af_heart`), generated with `bun run tts` (scripts/tts.mjs).

The captions for this voiceover are NOT burned into the video: the landing page
overlays Saywhat's own live captions using `src/lib/captions/promo-transcript.ts`.

| # | Line (voiceover) | On screen |
|---|------------------|-----------|
| 1 | Your videos deserve captions that pop. | Kinetic title, "pop" in yellow |
| 2 | Drop in a clip. | Phone frame, upload card filling up |
| 3 | Saywhat transcribes it, word by word. | Transcript appearing word by word |
| 4 | Pick a style: Pop, Karaoke, Punch, Boxed, or Clean. | Preset chips switching, caption sample changes look |
| 5 | Wrong word? Just fix it, like editing a doc. | A misheard word gets struck out and retyped |
| 6 | Then export an MP4 with captions burned in, or grab the SRT. | Export progress bar, MP4 / SRT / VTT pills |
| 7 | It all runs in your browser, and nothing gets stored. | Browser chip + lock, "Nothing stored" |
| 8 | No subscription. Pay per video, and your first three are free. | "Pay per video" + "3 free videos" |
| 9 | Saywhat. | Wordmark end card |

## Full text (as fed to TTS)

> Your videos deserve captions that pop. Drop in a clip. Saywhat transcribes it, word by word.
> Pick a style: Pop, Karaoke, Punch, Boxed, or Clean. Wrong word? Just fix it, like editing a doc.
> Then export an MP4 with captions burned in, or grab the SRT.
> It all runs in your browser, and nothing gets stored.
> No subscription. Pay per video, and your first three are free. Saywhat.

## Stock footage

The product scene plays two muted talking-to-camera clips inside the phone, both from
Pexels (free to use, no attribution required):

- `public/talk-man.mp4`: https://www.pexels.com/video/a-man-talking-7261920/
- `public/talk-woman.mp4`: https://www.pexels.com/video/expressive-woman-speaking-indoors-36931662/
