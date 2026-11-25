import type { Viewport } from "next"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { EditSection } from "@/components/site/landing/edit-section"
import { Faq } from "@/components/site/landing/faq"
import { FinalCta } from "@/components/site/landing/final-cta"
import { Hero } from "@/components/site/landing/hero"
import { HowItWorks } from "@/components/site/landing/how-it-works"
import { Privacy } from "@/components/site/landing/privacy"
import { ProofStrip } from "@/components/site/landing/proof-strip"
import { StyleGallery } from "@/components/site/landing/style-gallery"
import { Pricing } from "@/components/site/landing/pricing"
import { FREE_CREDITS } from "@/lib/billing/packs"
// marketing-only typefaces: display serif + UI sans (the app keeps Geist)
import "@fontsource/instrument-serif/400.css"
import "@fontsource/instrument-serif/400-italic.css"
import "@fontsource-variable/inter-tight/index.css"
import "@fontsource-variable/archivo/wdth.css"
import "@fontsource-variable/archivo/wdth-italic.css"

export const viewport: Viewport = { themeColor: "#0a0a0a" }

export default function Home() {
  return (
    // `.site` swaps the shadcn tokens for the light "paper" palette on this page only
    <div className="site flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ProofStrip />
        <StyleGallery />
        <EditSection />
        <HowItWorks />
        <Privacy />
        <Pricing />
        <Faq />
        <FinalCta freeCredits={FREE_CREDITS} />
      </main>
      <SiteFooter />
    </div>
  )
}
