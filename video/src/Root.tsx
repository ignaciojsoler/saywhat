import "@fontsource-variable/inter-tight/index.css"
import "@fontsource/instrument-serif/400-italic.css"
import "@fontsource/montserrat/800.css"
import { Composition } from "remotion"
import { Promo } from "./Promo"
import { DURATION_FRAMES, FPS } from "./timing"

export const Root = () => (
  <Composition
    id="Promo"
    component={Promo}
    durationInFrames={DURATION_FRAMES}
    fps={FPS}
    width={1080}
    height={1920}
    defaultProps={{ burnCaptions: false }}
  />
)
