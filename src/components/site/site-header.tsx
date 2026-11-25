import Link from "next/link"
import { Suspense } from "react"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "./logo"
import { HeaderSession, MenuSession } from "./header-session"
import { HeaderScroll } from "./header-scroll"
import { PILL } from "./pill"
import { MobileMenu, MobileMenuLogin } from "./mobile-menu"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/#styles", label: "Styles" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
]

export function SiteHeader() {
  return (
    <HeaderScroll>
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-5 sm:px-6 md:gap-8">
        <Logo className="text-xl sm:text-2xl" />
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
          <MobileMenu
            items={NAV}
            account={
              <Suspense fallback={<MobileMenuLogin />}>
                <MenuSession fallback={<MobileMenuLogin />} />
              </Suspense>
            }
          />
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
        className="focus-visible:ring-ring hidden rounded-full px-4 py-2 text-sm whitespace-nowrap text-white/70 transition-colors outline-none hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 sm:block"
      >
        Log in
      </Link>
      <Button asChild className={cn(PILL, "px-4 sm:px-5")}>
        <Link href="/signup">
          Start free
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </>
  )
}
