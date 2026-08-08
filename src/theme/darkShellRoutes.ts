/**
 * Routes that use the dark app shell (LibAry-aligned).
 * Home, Login, PublicReport stay light paper/gold.
 * New authenticated app routes should opt in here.
 */
export const DARK_SHELL_ROUTES: readonly string[] = [
  '/workspace',
  '/audit',
  '/publish',
  '/approvals',
] as const;

export function isDarkShellPath(pathname: string): boolean {
  if (!pathname) return false;
  // exact match or nested under listed prefix (future /workspace/...)
  return DARK_SHELL_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
}
