import type { Metadata } from "next"
import { Suspense } from "react"
import { AuthForm } from "@/components/account/auth-form"
import { googleEnabled } from "@/lib/auth"

export const metadata: Metadata = { title: "Log in · Saywhat" }

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="login" googleEnabled={googleEnabled} />
    </Suspense>
  )
}
