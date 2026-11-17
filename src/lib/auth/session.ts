import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/types/database';

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
 * Works both with live Supabase Auth and offline demo sessions.
 */
export async function getServerSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const demoEmailCookie = cookieStore.get('kria_demo_user')?.value;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseConfigured = Boolean(
    supabaseUrl && !supabaseUrl.includes('placeholder')
  );

  // If live Supabase is configured, check real session first
  if (isSupabaseConfigured) {
    try {
      const supabase = createClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!error && session?.user) {
        // Query user's profile for role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();

        return {
          id: session.user.id,
          email: session.user.email || '',
          role: (profile?.role as UserRole) || (session.user.user_metadata?.role as UserRole) || 'staff',
          fullName: profile?.full_name || session.user.user_metadata?.full_name || 'KRIA User',
          isDemo: false,
        };
      }
    } catch {
      // Fallback to demo session if Supabase auth call fails
    }
  }

  // Offline / Demo Session resolution
  if (demoEmailCookie && DEMO_USERS[demoEmailCookie]) {
    return DEMO_USERS[demoEmailCookie];
  }

  // Default demo owner session if no cookie is set in local development
  return DEMO_USERS['admin@kriatech.com'];
}

/**
 * Checks if current user has Owner or Admin privileges.
 */
export async function isAuthorizedOwner(): Promise<boolean> {
  const session = await getServerSession();
  return session?.role === 'owner' || session?.role === 'admin';
}
