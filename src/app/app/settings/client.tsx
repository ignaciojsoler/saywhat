"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2Icon, HardDriveIcon, LogOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { useAccount } from "@/components/account/account-provider"
import { authClient } from "@/lib/auth-client"
import { clearLocalVideos, formatBytes, localUsage } from "@/lib/local-videos"
import { cn } from "@/lib/utils"

function Section({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-card flex flex-col gap-5 rounded-2xl border p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </section>
  )
}

const field = "h-10 text-sm md:text-sm"

export function SettingsView({ hasPassword, google }: { hasPassword: boolean; google: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <Profile />
      <SignIn hasPassword={hasPassword} google={google} />
      <DeviceStorage />
      <SignOut />
    </div>
  )
}

function Profile() {
  const { account } = useAccount()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(account.name)
  const dirty = name.trim() !== account.name && name.trim().length > 0

  return (
    <Section title="Profile">
      <form
        className="flex flex-col gap-5"
        action={() =>
          startTransition(async () => {
            const { error } = await authClient.updateUser({ name: name.trim() })
            if (error) return void toast.error("Couldn't save your name", { description: error.message })
            toast.success("Name updated")
            router.refresh()
          })
        }
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-sm">
            Name
          </Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className={field} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm">
            Email
          </Label>
          <Input id="email" value={account.email} readOnly aria-describedby="email-hint" className={cn(field, "text-muted-foreground")} />
          <p id="email-hint" className="text-muted-foreground text-xs">
            Your email can&apos;t be changed here. Write to us if you need to move your account.
          </p>
        </div>
        <Button type="submit" className="h-9 self-start px-4 text-sm" disabled={!dirty || pending}>
          {pending && <Spinner />}
          Save
        </Button>
      </form>
    </Section>
  )
}

function SignIn({ hasPassword, google }: { hasPassword: boolean; google: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  return (
    <Section title="Sign-in" description="How you log in to Saywhat.">
      {google && (
        <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <GoogleIcon />
          <span className="flex-1 text-sm font-medium">Google</span>
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2Icon className="size-4" />
            Connected
          </span>
        </div>
      )}

      {hasPassword ? (
        <form
          key={formKey}
          className="flex flex-col gap-4"
          action={(form) => {
            setError(null)
            const currentPassword = String(form.get("current") ?? "")
            const newPassword = String(form.get("next") ?? "")
            if (newPassword !== String(form.get("confirm") ?? "")) return setError("The new passwords don't match.")
            startTransition(async () => {
              const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
              if (error) {
                setError(error.code === "INVALID_PASSWORD" ? "That current password isn't right." : (error.message ?? "Couldn't change your password."))
                return
              }
              setFormKey((k) => k + 1)
              toast.success("Password changed", { description: "Other devices were signed out." })
            })
          }}
        >
          <h3 className="text-sm font-medium">Change password</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current" className="text-sm">
                Current password
              </Label>
              <Input id="current" name="current" type="password" required autoComplete="current-password" className={field} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next" className="text-sm">
                New password
              </Label>
              <Input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" className={field} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm" className="text-sm">
                Repeat new password
              </Label>
              <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className={field} />
            </div>
          </div>
          {error && (
            <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3.5 py-2.5 text-sm">
              {error}
            </p>
          )}
          <Button type="submit" variant="secondary" className="h-9 self-start px-4 text-sm" disabled={pending}>
            {pending && <Spinner />}
            Change password
          </Button>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">You sign in with Google, so there&apos;s no Saywhat password to change.</p>
      )}
    </Section>
  )
}

function DeviceStorage() {
  const { account } = useAccount()
  const [usage, setUsage] = useState<{ count: number; bytes: number } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    localUsage(account.id).then(setUsage)
  }, [account.id])

  const clear = () =>
    startTransition(async () => {
      await clearLocalVideos(account.id)
      setUsage(await localUsage(account.id))
      setConfirm(false)
      toast.success("Videos removed from this device", { description: "Your captions are still saved in your account." })
    })

  return (
    <Section
      title="Videos on this device"
      description="Your videos are never uploaded. Saywhat keeps a copy in this browser so your projects open instantly; only the captions are saved to your account."
    >
      <div className="flex flex-col gap-4 rounded-xl border px-4 py-3 sm:flex-row sm:items-center">
        <HardDriveIcon className="text-muted-foreground hidden size-5 shrink-0 sm:block" />
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-medium tabular-nums">
            {usage ? `${usage.count} ${usage.count === 1 ? "video" : "videos"} · ${formatBytes(usage.bytes)}` : "Checking…"}
          </span>
          <span className="text-muted-foreground text-xs">Stored in this browser only</span>
        </div>
        <Button variant="outline" className="h-9 px-3 text-sm" disabled={!usage?.count} onClick={() => setConfirm(true)}>
          Clear videos on this device
        </Button>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove videos from this browser?</DialogTitle>
            <DialogDescription>
              Your captions and edits stay in your account. To keep editing a project here, you&apos;ll be asked to select its original file again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" className="h-9 px-3 text-sm" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-9 px-3 text-sm" onClick={clear} disabled={pending}>
              {pending && <Spinner />}
              Remove videos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}

function SignOut() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Section title="Log out" description="Sign out of Saywhat on this browser. Videos stored here stay until you clear them.">
      <Button
        variant="outline"
        className="h-9 self-start px-4 text-sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await authClient.signOut()
            router.replace("/")
            router.refresh()
          })
        }
      >
        {pending ? <Spinner /> : <LogOutIcon />}
        Log out
      </Button>
    </Section>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}
