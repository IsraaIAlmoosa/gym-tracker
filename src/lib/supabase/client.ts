import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";
import {
  REMEMBER_ME_COOKIE,
  REMEMBER_ME_COOKIE_MAX_AGE,
  applyRememberMe,
  shouldPersistSession,
} from "./remember-me";

type WritableCookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
};

function readDocumentCookies(): { name: string; value: string }[] {
  if (typeof document === "undefined") return [];
  return document.cookie
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eq = pair.indexOf("=");
      const name = eq === -1 ? pair : pair.slice(0, eq);
      const value = eq === -1 ? "" : pair.slice(eq + 1);
      return { name: decodeURIComponent(name), value: decodeURIComponent(value) };
    });
}

function writeDocumentCookie(name: string, value: string, options: WritableCookieOptions) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (typeof options.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`);
  if (options.sameSite) {
    const sameSite = options.sameSite === true ? "Strict" : options.sameSite;
    parts.push(`SameSite=${sameSite}`);
  }
  if (options.secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => readDocumentCookies(),
      setAll: (cookiesToSet) => {
        const persist = shouldPersistSession(
          readDocumentCookies().find((c) => c.name === REMEMBER_ME_COOKIE)?.value,
        );
        cookiesToSet.forEach(({ name, value, options }) => {
          writeDocumentCookie(name, value, applyRememberMe(value, options, persist));
        });
      },
    },
  });
}

/**
 * Records the user's "remember me" choice so it can be read on subsequent
 * cookie writes (this client's own future token refreshes, the middleware,
 * and server-side reads) — see remember-me.ts for why this can't just be a
 * cookieOptions.maxAge passed to createBrowserClient. Call before signing in.
 */
export function setRememberMePreference(remember: boolean) {
  writeDocumentCookie(REMEMBER_ME_COOKIE, remember ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    maxAge: REMEMBER_ME_COOKIE_MAX_AGE,
  });
}
