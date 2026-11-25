import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

/** Optimistic check only (cookie present): pages and route handlers still verify the session. */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = { matcher: ["/app/:path*"] }
