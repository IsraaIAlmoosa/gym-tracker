import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";
import { REMEMBER_ME_COOKIE, applyRememberMe, shouldPersistSession } from "./remember-me";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const persist = shouldPersistSession(cookieStore.get(REMEMBER_ME_COOKIE)?.value);
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, applyRememberMe(value, options, persist)),
          );
        } catch {
          // Called from a Server Component during render — safe to ignore
          // as long as a session-refreshing proxy/middleware is in place.
        }
      },
    },
  });
}
