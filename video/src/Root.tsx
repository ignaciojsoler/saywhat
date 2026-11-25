import "@fontsource/montserrat/900.css"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/inter/700.css"
import "@fontsource/inter/800.css"
import "@fontsource/bebas-neue/400.css"
import "@fontsource/poppins/800.css"
import { Composition } from "remotion"
import { Promo } from "./Promo"
import { DURATION_FRAMES, FPS } from "./timing"

export const Root = () => (
  <Composition id="Promo" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1080} height={1920} />
)
