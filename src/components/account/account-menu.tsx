"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { CoinsIcon, HomeIcon, LogOutIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { useAccount } from "./account-provider"

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?"

/** Credit balance pill: links to the store, turns amber when running low. */
export function CreditsPill({ className }: { className?: string }) {
  const { account } = useAccount()
  const low = account.credits <= 1
  return (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn(
        "gap-1.5 rounded-full border px-3 tabular-nums",
        low ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15" : "bg-white/[0.03]",
        className,
      )}
    >
      <Link href="/app/credits" aria-label={`${account.credits} credits left. Buy more`}>
        <CoinsIcon />
        {account.credits}
        <span className="text-muted-foreground hidden sm:inline">{account.credits === 1 ? "credit" : "credits"}</span>
        {low && <PlusIcon className="-mr-0.5" />}
      </Link>
    </Button>
  )
}

export function AccountMenu() {
  const { account } = useAccount()
  const router = useRouter()

  const signOut = async () => {
    await authClient.signOut()
    router.replace("/")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="focus-visible:ring-ring grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#262626] text-xs font-semibold text-white ring-1 ring-white/15 outline-none focus-visible:ring-2"
        >
          {account.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initials(account.name)
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
          <span className="text-foreground truncate text-sm font-medium">{account.name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{account.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/credits">
            <CoinsIcon />
            Credits & billing
            <span className="text-muted-foreground ml-auto tabular-nums">{account.credits}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/">
            <HomeIcon />
            Saywhat home
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
