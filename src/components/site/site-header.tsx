import Link from "next/link"
import { Suspense } from "react"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "./logo"
import { HeaderSession } from "./header-session"
import { HeaderScroll } from "./header-scroll"
import { PILL } from "./pill"

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
        <div className="ml-auto flex items-center gap-2">
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
      <Link
        href="/login"
        className="focus-visible:ring-ring rounded-full px-4 py-2 text-sm whitespace-nowrap text-white/70 transition-colors outline-none hover:bg-white/[0.07] hover:text-white focus-visible:ring-2"
      >
        Log in
      </Link>
      <Button asChild className={PILL}>
        <Link href="/signup">
          Start free
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </>
  )
}
