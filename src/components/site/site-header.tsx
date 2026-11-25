import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "./logo"
import { HeaderSession } from "./header-session"
import { HeaderScroll } from "./header-scroll"

const NAV = [
  { href: "/#styles", label: "Styles" },
  { href: "/#how", label: "How it works" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
]

export function SiteHeader() {
  return (
    <HeaderScroll>
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-8 px-5 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Suspense fallback={<GuestActions />}>
            <HeaderSession fallback={<GuestActions />} />
          </Suspense>
        </div>
      </div>
    </HeaderScroll>
  )
}

export function GuestActions() {
  return (
    <>
      <Link href="/login" className="whitespace-nowrap text-white/70 hover:text-white text-sm transition-colors">Log in</Link>
      <Button asChild className="h-10 rounded-full bg-white px-5 font-semibold text-black">
        <Link href="/signup" className="flex items-center gap-1.5">Start free <span aria-hidden>→</span></Link>
      </Button>
    </>
  )
}
