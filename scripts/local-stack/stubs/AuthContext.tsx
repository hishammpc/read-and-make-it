import { createContext, useContext, type ReactNode } from 'react';
import type { AuthErrorCode, UserSession } from '@/lib/emailOnlyAuth';

// Test stand-in for src/contexts/AuthContext: the signed-in user is whoever the suite
// picked with setUser() (no login, no localStorage session)
interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  role: 'admin' | 'employee' | null;
  signIn: (email: string) => Promise<{ success: boolean; error?: AuthErrorCode }>;
  signOut: () => Promise<void>;
  setUser: (user: UserSession | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = (globalThis as { __HARNESS_USER__?: UserSession | null }).__HARNESS_USER__ ?? null;
  const value: AuthContextType = {
    user,
    loading: false,
    role: user?.role ?? null,
    signIn: async () => ({ success: false }),
    signOut: async () => {},
    setUser: () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Mirrors the real module's exports; a test stand-in is never hot-reloaded
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
