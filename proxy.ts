import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes — accessible without authentication. The landing page ("/") is
  // always public; auth-related pages are public so users can sign in/up; the
  // auth callback is public so Supabase can complete code exchange.
  const publicPathPrefixes = ["/login", "/register", "/api/register", "/forgot-password", "/reset-password", "/auth/callback"]
  const isPublic = pathname === "/" || publicPathPrefixes.some((p) => pathname.startsWith(p))

  // Authenticated users shouldn't re-enter the login page — send them to dashboard.
  // Note: we intentionally do NOT redirect them away from "/" — the landing page
  // is meant to be accessible to everyone.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // Only protected routes redirect unauthenticated users to login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
