/**
 * KRIA AI - Demo Mode Isolation Controller
 * Enforces that default application state is clean production (0 fake records).
 * Demo fixtures are strictly opt-in and isolated from real business operations.
 */

export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem('kria_demo_mode_enabled') === 'true';
}

export function setDemoModeActive(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('kria_demo_mode_enabled', enabled ? 'true' : 'false');
    // Also set cookie so Next.js server components can read it if needed
    document.cookie = `kria_demo_mode=${enabled ? 'true' : 'false'}; path=/; max-age=31536000; SameSite=Lax`;
  }
}
