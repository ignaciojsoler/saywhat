import { Logo } from "@/components/site/logo"
import { cn } from "@/lib/utils"
import { AccountMenu, CreditsPill } from "./account-menu"

/** Top bar for the signed-in app screens (upload, processing, credits). */
export function AppHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-5", className)}>
      <Logo href="/app" className="text-xl" />
      {children}
      <div className="ml-auto flex items-center gap-2">
        <CreditsPill />
        <AccountMenu />
      </div>
    </header>
  )
}
