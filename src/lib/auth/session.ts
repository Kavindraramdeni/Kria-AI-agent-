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
  'admin@kriatech.in': {
    id: 'user-owner-001',
    email: 'admin@kriatech.in',
    role: 'owner',
    fullName: 'Kria Tech Owner',
    isDemo: true,
  },
  'sales@kriatech.in': {
    id: 'user-owner-001',
    email: 'sales@kriatech.in',
    role: 'owner',
    fullName: 'KRIA Tech Sales Owner',
    isDemo: true,
  },
  'staff@kriatech.in': {
    id: 'user-staff-002',
    email: 'staff@kriatech.in',
    role: 'staff',
    fullName: 'Shop Floor Staff',
    isDemo: true,
  },
  'kavindraraj1703@gmail.com': {
    id: 'user-owner-001',
    email: 'kavindraraj1703@gmail.com',
    role: 'owner',
    fullName: 'Kavindra (KRIA Owner)',
    isDemo: false,
  },
};

export const VALID_USER_ROLES: readonly UserRole[] = ['owner', 'admin', 'staff'];

export function isValidUserRole(role: unknown): role is UserRole {
  return typeof role === 'string' && VALID_USER_ROLES.includes(role as UserRole);
}

/**
 * Resolves trusted user role strictly from database profile.
 * NEVER trusts or reads user.user_metadata or raw_user_meta_data.
 * If profile is missing, lookup fails, or role is invalid, returns 'staff' (unprivileged).
 */
export function resolveTrustedRole(
  profile: { role?: any } | null | undefined,
  profileError?: any
): UserRole {
  if (profileError || !profile || !isValidUserRole(profile.role)) {
    return 'staff';
  }
  return profile.role;
}

/**
 * Retrieves the current session and user role.
 * Strictly verifies the session with Supabase Auth on the server.
 * Never defaults to owner without authentication.
 * Never uses user_metadata.role for authorization.
 */
export async function getServerSession(customClient?: any): Promise<UserSession | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseConfigured = Boolean(
    supabaseUrl && !supabaseUrl.includes('placeholder')
  );

  // If live Supabase is configured or custom client provided, verify real session
  if (customClient || isSupabaseConfigured) {
    try {
      const supabase = customClient || createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        // Query user's profile for role from trusted database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();

        // Strictly derive role from profiles table.
        // User metadata role is NEVER trusted for authorization.
        const role = resolveTrustedRole(profile, profileError);

        return {
          id: user.id,
          email: user.email || '',
          role,
          fullName: (profile && !profileError && profile.full_name) || user.email || 'KRIA User',
          isDemo: false,
        };
      }
    } catch {
      // In case of error querying supabase auth
    }
  }

  // Development-only isolated demo mode (strictly opt-in, never active in production)
  if (process.env.NODE_ENV === 'development' && isDemoModeActive()) {
    return DEMO_USERS['admin@kriatech.in'];
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
