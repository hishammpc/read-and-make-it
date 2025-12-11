import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  loginWithEmailOnly,
  getCurrentSession,
  logout,
  UserSession
} from '@/lib/emailOnlyAuth';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  role: 'admin' | 'employee' | null;
  signIn: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: UserSession | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session on mount
    const session = getCurrentSession();
    if (session) {
      setUser(session);
      setRole(session.role);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const result = await loginWithEmailOnly(email);

    if (result.success && result.user) {
      setUser(result.user);
      setRole(result.user.role);
    }

    return result;
  };

  const signOut = async () => {
    logout();
    setUser(null);
    setRole(null);
    navigate('/auth');
  };

  // Wrapper for setUser that also updates role
  const handleSetUser = (newUser: UserSession | null) => {
    setUser(newUser);
    setRole(newUser?.role || null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, signIn, signOut, setUser: handleSetUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
