// Routes that render without the authenticated app shell (Sidebar, TopBar,
// BottomNav) — the login flow and the standalone password-reset page.
// Shared by Sidebar/TopBar/BottomNav (to hide themselves) and MainWrapper
// (to skip the layout space reserved for the sidebar), so there's exactly
// one list to keep in sync when a new chrome-less route is added.
const NO_APP_CHROME_PREFIXES = ['/login', '/auth', '/reset-password'];

export function isNoAppChromeRoute(pathname: string): boolean {
  return NO_APP_CHROME_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
