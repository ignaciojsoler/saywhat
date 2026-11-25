import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
// caption typefaces, self-hosted (no Google Fonts fetch at build time)
import "@fontsource/montserrat/900.css"
import "@fontsource/bebas-neue/400.css"
import "@fontsource/poppins/800.css"
import "@fontsource/inter/700.css"
import "./globals.css"

export const metadata: Metadata = {
  // absolute base for the file-based opengraph-image / icons
  metadataBase: process.env.APP_URL ? new URL(process.env.APP_URL) : undefined,
  title: "Saywhat — captions that pop",
  description: "Word-by-word animated captions for short videos. Edit any word, pick a style, export MP4 or SRT. Your video never leaves your browser.",
}

export const viewport: Viewport = { themeColor: "#0a0a0a" }

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark style-mira ${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
