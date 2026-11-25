import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type Crumb = { label: string; href?: string }

/** Standard content column for app pages. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-8", className)}>{children}</main>
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${c.label}-${i}`} className={cn("flex items-center gap-1.5", last && "min-w-0")}>
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors outline-none focus-visible:ring-2">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "text-foreground")}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRightIcon className="size-3.5 shrink-0 opacity-60" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Title row of an app page: optional breadcrumb, title, description and actions on the right. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">{title}</h1>
          {description && <p className="text-muted-foreground text-[15px]">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
