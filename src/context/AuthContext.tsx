import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiException } from '@/lib/api';

export interface AuthUser {
  id: string;
  kind: 'admin' | 'board';
  email: string;
  full_name: string;
  role: string;
  status: string;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem('auth_token', token);
    sessionStorage.removeItem('auth_token');
  } else {
    sessionStorage.setItem('auth_token', token);
    localStorage.removeItem('auth_token');
  }
}

function clearToken() {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
}

function hasToken(): boolean {
  return !!(localStorage.getItem('auth_token') ?? sessionStorage.getItem('auth_token'));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      setIsLoading(false);
      return;
    }

    api.get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string, remember: boolean) {
    const data = await api.post<LoginResponse>('/auth/login', { email, password });
    saveToken(data.token, remember);
    setUser(data.user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  async function refreshUser() {
    const u = await api.get<AuthUser>('/auth/me');
    setUser(u);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
