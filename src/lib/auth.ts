import "server-only"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/db"
import * as schema from "@/db/schema"
import { FREE_CREDITS } from "@/lib/billing/packs"

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined

export const googleEnabled = Boolean(google)

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders: google ? { google } : {},
  user: {
    additionalFields: {
      // never settable from sign-up input; changed only by the credits module
      credits: { type: "number", defaultValue: FREE_CREDITS, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (u) => {
          await db.insert(schema.creditLedger).values({ userId: u.id, delta: FREE_CREDITS, reason: "welcome" })
        },
      },
    },
  },
  // must stay last: lets Server Actions set auth cookies
  plugins: [nextCookies()],
})
