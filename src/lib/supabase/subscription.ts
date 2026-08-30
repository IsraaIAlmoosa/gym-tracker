import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileSubscriptionFields = {
  subscription_status: string | null;
  is_premium_override: boolean | null;
};

/**
 * Single source of truth for premium access: a paid subscription
 * OR a manually-granted override (set by hand in the Supabase dashboard).
 */
export function isPremiumUser(profile: ProfileSubscriptionFields | null): boolean {
  if (!profile) return false;
  return profile.subscription_status === "مدفوع" || profile.is_premium_override === true;
}

export async function getIsPremiumUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_status, is_premium_override")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return isPremiumUser(data);
}
