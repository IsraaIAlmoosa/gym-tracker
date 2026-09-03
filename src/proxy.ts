import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { REMEMBER_ME_COOKIE, applyRememberMe, shouldPersistSession } from '@/lib/supabase/remember-me'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  const persistSession = shouldPersistSession(request.cookies.get(REMEMBER_ME_COOKIE)?.value)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
            supabaseResponse.cookies.set(name, value, applyRememberMe(value, options, persistSession))
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  if (pathname.startsWith('/auth/callback')) {
    return supabaseResponse
  }

  const intlResponse = intlMiddleware(request)

  // Copy the whole cookie object (not just name/value) so attributes set
  // above -- notably maxAge, which is how the remember-me choice is
  // actually enforced -- survive into the response that's really returned.
  // (Copying only name+value here silently downgraded every auth cookie to
  // a session-only cookie on any request next-intl also touched.)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie)
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/auth/callback'],
}
