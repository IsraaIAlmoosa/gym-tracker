/**
 * Resolves what to call the user: full name > first name only > email
 * local-part > a generic gendered fallback. Never shows the raw email
 * when any part of a saved name exists.
 */
export function resolveDisplayName(
  firstName: string | null,
  lastName: string | null,
  email: string | null | undefined,
  genericFallback: string
): string {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';

  if (first && last) return `${first} ${last}`;
  if (first) return first;

  const emailLocalPart = email?.split('@')[0];
  return emailLocalPart || genericFallback;
}
