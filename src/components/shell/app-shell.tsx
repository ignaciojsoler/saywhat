"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ChevronsUpDownIcon,
  CoinsIcon,
  FilmIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"
import { useAccount } from "@/components/account/account-provider"
import { Logo } from "@/components/site/logo"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import type { ProjectSummary } from "@/lib/project-schema"
import { useEditor } from "@/store/editor"
import { useSidebarPref } from "./use-sidebar"

type NavItem = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }

const NAV: NavItem[] = [
  { href: "/app", label: "Videos", icon: FilmIcon, match: (p) => p === "/app" || p.startsWith("/app/videos") },
  { href: "/app/credits", label: "Credits & billing", icon: CoinsIcon, match: (p) => p.startsWith("/app/credits") },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon, match: (p) => p.startsWith("/app/settings") },
]

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?"

/**
 * Signed-in app frame: a left sidebar (collapsible to an icon rail, remembered per user) on desktop,
 * a top bar with an off-canvas menu on mobile. The editor route always starts on the rail.
 */
export function AppShell({ recents, children }: { recents: ProjectSummary[]; children: React.ReactNode }) {
  const { account } = useAccount()
  const pathname = usePathname()
  const inEditor = pathname.startsWith("/app/videos/")
  const [pref, setPref] = useSidebarPref(account.id)
  // in the editor the rail is the default; expanding it there lasts until you leave
  const [editorExpanded, setEditorExpanded] = useState(false)
  const [editorPath, setEditorPath] = useState(pathname)
  if (editorPath !== pathname) {
    setEditorPath(pathname)
    setEditorExpanded(false)
  }
  const collapsed = inEditor ? !editorExpanded : pref
  const toggle = () => (inEditor ? setEditorExpanded((v) => !v) : setPref(!pref))

  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobilePath, setMobilePath] = useState(pathname)
  if (mobilePath !== pathname) {
    setMobilePath(pathname)
    setMobileOpen(false)
  }

  // Ctrl/Cmd+B toggles the sidebar, like Linear, VS Code or Notion
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b" && !isTyping(e.target)) {
        e.preventDefault()
        document.getElementById("sidebar-toggle")?.click()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex min-h-dvh w-full">
      <aside
        aria-label="Main navigation"
        data-collapsed={collapsed || undefined}
        className={cn(
          "bg-sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex",
          collapsed ? "w-[60px]" : "w-60",
        )}
      >
        <SidebarBody collapsed={collapsed} onToggle={toggle} recents={recents} pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-2 backdrop-blur md:hidden">
          <Button variant="ghost" className="size-10 rounded-lg" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <MenuIcon className="size-5" />
          </Button>
          <Logo href="/app" className="text-xl" />
          <div className="ml-auto flex items-center gap-1.5 pr-1">
            <Link
              href="/app/credits"
              aria-label={`${account.credits} credits left. Buy more`}
              className={cn(
                "focus-visible:ring-ring flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium tabular-nums outline-none focus-visible:ring-2",
                account.credits <= 1 ? "border-primary/50 text-primary" : "text-foreground",
              )}
            >
              <CoinsIcon className="size-4" />
              {account.credits}
            </Link>
            <Button asChild className="size-9 rounded-full p-0" aria-label="New video">
              <Link href="/app/new">
                <PlusIcon className="size-4.5" />
              </Link>
            </Button>
          </div>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="bg-sidebar w-72 max-w-[85vw] p-0 text-sm">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigate Saywhat</SheetDescription>
            <SidebarBody collapsed={false} recents={recents} pathname={pathname} mobile onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {children}
      </div>
    </div>
  )
}

function SidebarBody({
  collapsed,
  onToggle,
  recents,
  pathname,
  mobile,
  onNavigate,
}: {
  collapsed: boolean
  onToggle?: () => void
  recents: ProjectSummary[]
  pathname: string
  mobile?: boolean
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header: logo + collapse */}
      <div className={cn("flex h-14 shrink-0 items-center gap-2", collapsed ? "justify-center px-2" : "px-4")}>
        {collapsed ? (
          <Link
            href="/app"
            aria-label="Saywhat videos"
            className="wordmark focus-visible:ring-ring grid size-9 place-items-center rounded-lg text-xl leading-none outline-none focus-visible:ring-2"
          >
            S
          </Link>
        ) : (
          <Logo href="/app" className="text-xl" />
        )}
        {!mobile && !collapsed && onToggle && <ToggleButton collapsed={false} onToggle={onToggle} className="ml-auto" />}
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-3", collapsed ? "px-2" : "px-3")}>
        {/* primary action */}
        <Hint label="New video" show={collapsed}>
          <Button
            asChild
            className={cn("h-9 w-full gap-2 rounded-lg text-sm font-semibold", collapsed && "px-0")}
            aria-label={collapsed ? "New video" : undefined}
          >
            <Link href="/app/new" onClick={onNavigate}>
              <PlusIcon className="size-4" />
              {!collapsed && "New video"}
            </Link>
          </Button>
        </Hint>

        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={item.match(pathname)} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>

        {!collapsed && recents.length > 0 && <Recents recents={recents} pathname={pathname} onNavigate={onNavigate} />}

        {collapsed && onToggle && !mobile && (
          <div className="flex justify-center">
            <ToggleButton collapsed onToggle={onToggle} />
          </div>
        )}
      </div>

      <div className={cn("flex shrink-0 flex-col gap-2 border-t", collapsed ? "items-center p-2" : "p-3")}>
        <CreditsCard collapsed={collapsed} onNavigate={onNavigate} />
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  )
}

function ToggleButton({ collapsed, onToggle, className }: { collapsed: boolean; onToggle: () => void; className?: string }) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          id="sidebar-toggle"
          type="button"
          onClick={onToggle}
          aria-label={label}
          aria-expanded={!collapsed}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-8 place-items-center rounded-md transition-colors outline-none hover:bg-white/[0.06] focus-visible:ring-2",
            className,
          )}
        >
          {collapsed ? <PanelLeftOpenIcon className="size-4" /> : <PanelLeftCloseIcon className="size-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label} <Kbd>Ctrl B</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

/** Tooltip only on the collapsed rail, where labels are hidden. */
function Hint({ label, show, children }: { label: string; show: boolean; children: React.ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

const itemClass = (active: boolean, collapsed: boolean) =>
  cn(
    "focus-visible:ring-ring flex h-9 items-center gap-2.5 rounded-lg text-sm transition-colors outline-none focus-visible:ring-2",
    collapsed ? "justify-center px-0" : "px-2.5",
    active ? "bg-white/[0.09] font-medium text-foreground" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
  )

function NavLink({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <Hint label={item.label} show={collapsed}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={itemClass(active, collapsed)}
      >
        <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    </Hint>
  )
}

function Recents({ recents, pathname, onNavigate }: { recents: ProjectSummary[]; pathname: string; onNavigate?: () => void }) {
  // the open project's title is edited live in the editor store
  const liveId = useEditor((s) => s.projectId)
  const liveTitle = useEditor((s) => s.title)
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-muted-foreground px-2.5 pb-1 text-xs font-medium">Recent</h2>
      {recents.map((p) => {
        const href = `/app/videos/${p.id}`
        const active = pathname === href
        return (
          <Link
            key={p.id}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(itemClass(active, false), "h-8 text-[13px]")}
          >
            <span className="truncate">{p.id === liveId && liveTitle ? liveTitle : p.title}</span>
          </Link>
        )
      })}
    </div>
  )
}

function CreditsCard({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { account } = useAccount()
  const n = account.credits
  const low = n <= 1
  const label = n === 0 ? "Out of credits" : `${n} ${n === 1 ? "credit" : "credits"} left`

  if (collapsed) {
    return (
      <Hint label={`${label} · Buy credits`} show>
        <Link
          href="/app/credits"
          onClick={onNavigate}
          aria-label={`${label}. Buy credits`}
          className={cn(
            "focus-visible:ring-ring flex h-9 w-full flex-col items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums outline-none hover:bg-white/[0.05] focus-visible:ring-2",
            low ? "text-primary" : "text-muted-foreground",
          )}
        >
          <CoinsIcon className="size-4" />
          {n}
        </Link>
      </Hint>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2.5 rounded-xl border p-3", low ? "border-primary/40 bg-primary/[0.07]" : "bg-white/[0.02]")}>
      <div className="flex items-center gap-2">
        <CoinsIcon className={cn("size-4 shrink-0", low ? "text-primary" : "text-muted-foreground")} />
        <span className="text-sm font-medium tabular-nums">{label}</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {n === 0 ? "Buy a pack to caption more videos." : low ? "Running low. 1 credit = 1 video." : "1 credit = 1 captioned video."}
      </p>
      <Button asChild variant={low ? "default" : "secondary"} className="h-8 rounded-lg text-[13px] font-medium">
        <Link href="/app/credits" onClick={onNavigate}>
          Buy credits
        </Link>
      </Button>
    </div>
  )
}

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { account } = useAccount()
  const router = useRouter()

  const signOut = async () => {
    await authClient.signOut()
    router.replace("/")
    router.refresh()
  }

  const avatar = (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#2a2a2a] text-xs font-semibold text-white ring-1 ring-white/15">
      {account.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={account.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initials(account.name)
      )}
    </span>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "focus-visible:ring-ring flex items-center gap-2.5 rounded-lg text-left outline-none hover:bg-white/[0.05] focus-visible:ring-2 data-[state=open]:bg-white/[0.07]",
            collapsed ? "size-10 justify-center" : "w-full p-1.5",
          )}
        >
          {avatar}
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{account.name}</span>
                <span className="text-muted-foreground truncate text-xs">{account.email}</span>
              </span>
              <ChevronsUpDownIcon className="text-muted-foreground size-4 shrink-0" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} className="w-60 text-sm">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
          <span className="text-foreground truncate text-sm font-medium">{account.name}</span>
          <span className="text-muted-foreground truncate text-xs font-normal">{account.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-sm">
          <Link href="/app/settings">
            <SettingsIcon />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-sm">
          <Link href="/app/credits">
            <CoinsIcon />
            Credits & billing
            <span className="text-muted-foreground ml-auto tabular-nums">{account.credits}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="text-sm">
          <Link href="/">
            <HomeIcon />
            Saywhat home
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} className="text-sm">
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
