import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../services/api";
import type { UsageToday } from "../types/auth";

const TOKEN_KEY = "access_token";
const PENDING_EMAIL_KEY = "pending_verify_email";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  email_verified: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  usageToday: UsageToday | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setPendingEmail: (email: string) => void;
  getPendingEmail: () => string | null;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  getToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [usageToday, setUsageToday] = useState<UsageToday | null>(null);

  const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

  const setToken = (token: string | null) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  };

  const refreshUsage = useCallback(async () => {
    if (!getToken()) {
      setUsageToday(null);
      return;
    }
    try {
      const res = await api.get<UsageToday>("/auth/usage/today");
      setUsageToday(res.data);
    } catch {
      setUsageToday(null);
    }
  }, [getToken]);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setUsageToday(null);
      return;
    }
    try {
      const res = await api.get<AuthUser>("/auth/me");
      setUser(res.data);
      await refreshUsage();
    } catch {
      setToken(null);
      setUser(null);
      setUsageToday(null);
    }
  }, [getToken, refreshUsage]);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>("/auth/login", {
      email,
      password,
    });
    setToken(res.data.access_token);
    setUser(res.data.user);
    await refreshUsage();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setUsageToday(null);
  };

  const setPendingEmail = (email: string) => {
    localStorage.setItem(PENDING_EMAIL_KEY, email);
  };

  const getPendingEmail = () => localStorage.getItem(PENDING_EMAIL_KEY);

  const value = useMemo(
    () => ({
      user,
      loading,
      usageToday,
      login,
      logout,
      setPendingEmail,
      getPendingEmail,
      refreshUser,
      refreshUsage,
      getToken,
    }),
    [user, loading, usageToday, refreshUser, refreshUsage, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function saveAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
