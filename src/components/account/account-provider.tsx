"use client"

import { createContext, use, useState } from "react"
import type { Account } from "@/lib/session"

type Ctx = { account: Account; setCredits: (n: number) => void }
const AccountContext = createContext<Ctx | null>(null)

/** Holds the signed-in account on the client; the credit balance updates live after each transcription. */
export function AccountProvider({ account, children }: { account: Account; children: React.ReactNode }) {
  const [credits, setCredits] = useState(account.credits)
  // a server refresh (router.refresh, return from checkout) brings a newer balance: adopt it during render
  const [serverCredits, setServerCredits] = useState(account.credits)
  if (serverCredits !== account.credits) {
    setServerCredits(account.credits)
    setCredits(account.credits)
  }
  return <AccountContext value={{ account: { ...account, credits }, setCredits }}>{children}</AccountContext>
}

export function useAccount() {
  const ctx = use(AccountContext)
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>")
  return ctx
}
