import type { Metadata } from "next"
import { Suspense } from "react"
import { AuthForm } from "@/components/account/auth-form"
import { googleEnabled } from "@/lib/auth"

export const metadata: Metadata = { title: "Create account · Saywhat" }

export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </Suspense>
  )
}
