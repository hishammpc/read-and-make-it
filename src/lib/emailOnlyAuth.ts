import { supabase } from '@/integrations/supabase/client';

/**
 * Custom email-only authentication for internal network use
 * Simply checks if email exists and creates a session
 * WARNING: Not secure for public internet - use only on internal networks
 */

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
}

const SESSION_KEY = 'mylearning_user_session';

/**
 * Pattern for a case-insensitive exact email match via `.ilike()`. ilike is needed
 * because stored emails are mixed-case, but its wildcards (% and _, plus * which
 * PostgREST maps to %) must be escaped or `_____@domain` matches someone else.
 */
function emailMatchPattern(email: string): string {
  return email.toLowerCase().trim().replace(/[\\%_*]/g, (c) => `\\${c}`);
}

/** Highest role across a user's user_roles rows (an admin may also hold 'employee'). */
function resolveRole(roleRows: unknown): 'admin' | 'employee' {
  const rows = (Array.isArray(roleRows) ? roleRows : [roleRows]) as Array<{ role?: string } | null>;
  return rows.some((r) => r?.role === 'admin') ? 'admin' : 'employee';
}

/**
 * Login with email only - checks if email exists in database
 */
export async function loginWithEmailOnly(email: string): Promise<{
  success: boolean;
  error?: string;
  user?: UserSession;
}> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      };
    }

    const cleanEmail = email.toLowerCase().trim();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        status,
        user_roles!inner(role)
      `)
      .ilike('email', emailMatchPattern(cleanEmail))
      .eq('status', 'active')
      .maybeSingle();

    if (profileError) {
      console.error('Profile check error:', profileError);
      return {
        success: false,
        error: 'Error checking user. Please try again.',
      };
    }

    if (!profile) {
      return {
        success: false,
        error: 'Email not registered or account is inactive. Please contact your administrator.',
      };
    }

    // Get role from user_roles
    const role = resolveRole(profile.user_roles);

    // Create session object
    const session: UserSession = {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      role,
    };

    // Store session in localStorage
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      user: session,
    };
  } catch (error) {
    console.error('Email-only login error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Get current session from localStorage
 */
export function getCurrentSession(): UserSession | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    return JSON.parse(sessionData);
  } catch {
    return null;
  }
}

/**
 * Logout - clear session
 */
export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  // The admin PIN unlock belongs to this login, not the browser tab.
  sessionStorage.removeItem('adminPinVerified');
  // Password-login admins also hold a Supabase Auth session; clear it on this device.
  void supabase.auth.signOut({ scope: 'local' });
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}

/**
 * Admin login with email and password (uses Supabase Auth)
 */
export async function loginAdmin(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
  user?: UserSession;
}> {
  try {
    // Validate inputs
    if (!email || !password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    const cleanEmail = email.toLowerCase().trim();

    // Sign in with Supabase Auth (secure with password)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id);

    if (roleError || resolveRole(userRoles) !== 'admin') {
      // Sign out if not admin
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Access denied. Admin privileges required.',
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, name, status')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Profile not found',
      };
    }

    // Check if active
    if (profile.status !== 'active') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Account is inactive',
      };
    }

    // Create session
    const session: UserSession = {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      role: 'admin',
    };

    // Store session
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      user: session,
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Check if an email is registered in the system
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', emailMatchPattern(email))
      .eq('status', 'active')
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}
