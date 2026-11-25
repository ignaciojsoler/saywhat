import Link from "next/link"
import { cn } from "@/lib/utils"

/** Caption-style wordmark: the product's own output used as its logo. */
export function Logo({ href = "/", className }: { href?: string | null; className?: string }) {
  const mark = <span className={cn("wordmark text-2xl leading-none", className)}>Saywhat</span>
  if (!href) return mark
  return (
    <Link href={href} aria-label="Saywhat home" className="focus-visible:ring-ring rounded-md outline-none focus-visible:ring-2">
      {mark}
    </Link>
  )
}
