import Link from "next/link"
import { Logo } from "./logo"

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/#styles", label: "Caption styles" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/signup", label: "Create account" },
      { href: "/login", label: "Log in" },
      { href: "/app/credits", label: "Buy credits" },
    ],
  },
]

export async function SiteFooter() {
  "use cache"
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1fr_auto_auto] md:gap-20">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo />
          <p className="text-muted-foreground text-sm leading-relaxed">
            Word-by-word captions for short videos. Made in Argentina.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title} className="flex flex-col gap-3">
            <h3 className="text-muted-foreground font-mono text-xs tracking-wide uppercase">{c.title}</h3>
            <ul className="flex flex-col gap-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-muted-foreground text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-5 py-5 font-mono text-xs sm:px-6">
        <p>© {new Date().getFullYear()} Saywhat</p>
        <p>Card checkout · Mercado Pago in Argentina</p>
      </div>
    </footer>
  )
}
