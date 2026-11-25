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
      <Button asChild variant="ghost" className="h-9 px-3 text-sm">
        <Link href="/login">Log in</Link>
      </Button>
      <Button asChild className="h-9 px-4 text-sm">
        <Link href="/signup">Start free</Link>
      </Button>
    </>
  )
}
