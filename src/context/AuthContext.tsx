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

interface RoleResponse {
  id: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  /** Resolved permission keys ("module.action") for the current user's role. */
  permissions: Set<string>;
  /** Whether the role permissions have finished loading. */
  permsLoaded: boolean;
  /** True if the current user holds the given "module.action" permission key. */
  can: (key: string) => boolean;
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
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [permsLoaded, setPermsLoaded] = useState(false);

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

  // Resolve the role's permission keys whenever the user (role) changes.
  useEffect(() => {
    if (!user) { setPermissions(new Set()); setPermsLoaded(false); return; }
    let cancelled = false;
    setPermsLoaded(false);
    api.get<RoleResponse>(`/roles/${user.role}`)
      .then(role => { if (!cancelled) setPermissions(new Set(role.permissions ?? [])); })
      .catch(() => { if (!cancelled) setPermissions(new Set()); })
      .finally(() => { if (!cancelled) setPermsLoaded(true); });
    return () => { cancelled = true; };
  }, [user]);

  const can = (key: string) => permissions.has(key);

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
    <AuthContext.Provider value={{ user, isLoading, permissions, permsLoaded, can, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
