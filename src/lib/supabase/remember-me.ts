import { DEFAULT_COOKIE_OPTIONS } from "@supabase/ssr";

/**
 * "Remember me" support for @supabase/ssr.
 *
 * @supabase/ssr's cookie storage always writes the auth session cookie with
 * its own DEFAULT_COOKIE_OPTIONS.maxAge (400 days) — any `cookieOptions.maxAge`
 * passed to createBrowserClient/createServerClient is silently overwritten
 * back to that default the moment a cookie is actually set (see this
 * package's cookies.js `setItem`). So a real remember-me toggle can't be done
 * via those public options; instead the browser, middleware, and server
 * Supabase clients all supply their own `cookies.setAll` and use
 * `applyRememberMe` below to intercept each write: when the user unchecked
 * "remember me", the session cookie's maxAge is stripped so it becomes a
 * normal end-of-browser-session cookie instead of a 400-day one.
 *
 * The choice itself is recorded in a small separate cookie (not touched by
 * Supabase) so the decision survives page navigations and token refreshes.
 */

export const REMEMBER_ME_COOKIE = "gt-remember-me";

// Kept long-lived regardless of which choice it records — it's just a UI
// preference (not a credential), and a "remembered" session can live up to
// DEFAULT_COOKIE_OPTIONS.maxAge, so the preference must outlive that too.
export const REMEMBER_ME_COOKIE_MAX_AGE = DEFAULT_COOKIE_OPTIONS.maxAge;

/** No recorded preference yet (e.g. a session from before this feature
 *  shipped) defaults to "persist", matching the previous, only behavior. */
export function shouldPersistSession(rememberMeCookieValue: string | undefined | null): boolean {
  return rememberMeCookieValue !== "0";
}

/**
 * Applies the remember-me choice to one cookie about to be written by
 * @supabase/ssr's storage adapter. Only touches an actual session write (a
 * non-empty value, at the library's own default maxAge) — explicit
 * deletions (value: "", maxAge: 0) and any unrelated cookie are passed
 * through untouched.
 */
export function applyRememberMe<T extends { maxAge?: number }>(
  value: string,
  options: T,
  persist: boolean,
): T {
  if (persist || !value || options.maxAge !== DEFAULT_COOKIE_OPTIONS.maxAge) {
    return options;
  }
  const rest = { ...options };
  delete rest.maxAge;
  return rest;
}
