"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"

type Mode = "login" | "signup"

/** Only same-origin paths, never protocol-relative URLs. */
export function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/app"
}

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Log in to keep captioning.",
    submit: "Log in",
    switchText: "New to Saywhat?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Your first 3 videos are free. No card needed.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLabel: "Log in",
    switchHref: "/login",
  },
} as const

export function AuthForm({ mode, googleEnabled }: { mode: Mode; googleEnabled: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get("next"))
  const c = COPY[mode]

  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [pending, startTransition] = useTransition()
  const [googlePending, setGooglePending] = useState(false)

  const submit = (form: FormData) => {
    setError(null)
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")
    const name = String(form.get("name") ?? "").trim()
    startTransition(async () => {
      const { error } =
        mode === "signup"
          ? await authClient.signUp.email({ email, password, name: name || email.split("@")[0] })
          : await authClient.signIn.email({ email, password })
      if (error) {
        setError(
          error.status === 401 || error.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "That email and password don't match."
            : error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
              ? "There's already an account with that email. Log in instead."
              : (error.message ?? "Something went wrong. Try again."),
        )
        return
      }
      router.replace(next)
      router.refresh()
    })
  }

  const google = async () => {
    setGooglePending(true)
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: next })
    if (error) {
      setGooglePending(false)
      setError(error.message ?? "Couldn't continue with Google.")
    }
  }

  const busy = pending || googlePending
  const switchHref = next !== "/app" ? `${c.switchHref}?next=${encodeURIComponent(next)}` : c.switchHref

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">{c.title}</h1>
        <p className="text-muted-foreground">{c.subtitle}</p>
      </div>

      {googleEnabled && (
        <>
          <Button type="button" variant="outline" className="h-11 text-[15px]" onClick={google} disabled={busy}>
            {googlePending ? <Spinner /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <div className="text-muted-foreground flex items-center gap-3 text-xs tracking-wide uppercase">
            <span className="bg-border h-px flex-1" />
            or with email
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      )}

      <form action={submit} className="flex flex-col gap-5">
        {mode === "signup" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-sm">
              Name
            </Label>
            <Input id="name" name="name" autoComplete="name" placeholder="Your name" disabled={busy} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-sm">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(error) || undefined}
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-sm">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              aria-invalid={Boolean(error) || undefined}
              disabled={busy}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg outline-none focus-visible:ring-2"
            >
              {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3.5 py-2.5 text-sm">
            {error}
          </p>
        )}

        <Button type="submit" className="mt-1 h-11 text-[15px]" disabled={busy}>
          {pending && <Spinner />}
          {c.submit}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {c.switchText}{" "}
        <Link href={switchHref} className="text-foreground font-medium underline-offset-4 hover:underline">
          {c.switchLabel}
        </Link>
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}
