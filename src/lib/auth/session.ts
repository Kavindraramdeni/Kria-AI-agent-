import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/types/database';
import { isDemoModeActive } from '@/lib/demo-mode';

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  isDemo: boolean;
}

export const DEMO_USERS: Record<string, UserSession> = {
  'admin@kriatech.com': {
    id: 'user-owner-001',
    email: 'admin@kriatech.com',
    role: 'owner',
    fullName: 'Kria Tech Owner',
    isDemo: true,
  },
  'staff@kriatech.com': {
    id: 'user-staff-002',
    email: 'staff@kriatech.com',
    role: 'staff',
    fullName: 'Shop Floor Staff',
    isDemo: true,
  },
};

/**
 * Retrieves the current session and user role.
 * Strictly verifies the session with Supabase Auth on the server.
 * Never defaults to owner without authentication.
 */
export async function getServerSession(): Promise<UserSession | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseConfigured = Boolean(
    supabaseUrl && !supabaseUrl.includes('placeholder')
  );

  // If live Supabase is configured, verify real session
  if (isSupabaseConfigured) {
    try {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        // Query user's profile for role from trusted database
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();

        return {
          id: user.id,
          email: user.email || '',
          role: (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || 'staff',
          fullName: profile?.full_name || user.user_metadata?.full_name || 'KRIA User',
          isDemo: false,
        };
      }
    } catch {
      // In case of error querying supabase auth
    }
  }

  // Development-only isolated demo mode (strictly opt-in, never active in production)
  if (process.env.NODE_ENV === 'development' && isDemoModeActive()) {
    return DEMO_USERS['admin@kriatech.com'];
  }

  // Default: strictly null when unauthenticated
  return null;
}

/**
 * Checks if current user has Owner or Admin privileges.
 */
export async function isAuthorizedOwner(): Promise<boolean> {
  const session = await getServerSession();
  if (!session) return false;
  return session.role === 'owner' || session.role === 'admin';
}
