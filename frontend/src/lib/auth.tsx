"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const AUTH_CHANGE_EVENT = "complif:auth-change";
const AUTH_SNAPSHOT_PENDING = "__complif_auth_pending__";

function getStoredSessionSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");

  if (!token || !storedUser) {
    return null;
  }

  return `${token}\n${storedUser}`;
}

function parseStoredUser(snapshot: string | null): User | null {
  if (!snapshot) {
    return null;
  }

  const separatorIndex = snapshot.indexOf("\n");
  if (separatorIndex === -1) {
    return null;
  }

  const storedUser = snapshot.slice(separatorIndex + 1);

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    return null;
  }
}

function emitAuthChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function persistAuthSession(session: LoginResponse) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("token", session.accessToken);
  localStorage.setItem("user", JSON.stringify(session.user));
  emitAuthChange();
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  emitAuthChange();
}

function subscribeToAuthChanges(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
  };
}

function getAuthSnapshot() {
  return getStoredSessionSnapshot();
}

function getAuthServerSnapshot() {
  return AUTH_SNAPSHOT_PENDING;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const storedSession = useSyncExternalStore(
    subscribeToAuthChanges,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );
  const isLoading = storedSession === AUTH_SNAPSHOT_PENDING;
  const user = useMemo(
    () =>
      storedSession === AUTH_SNAPSHOT_PENDING
        ? null
        : parseStoredUser(storedSession),
    [storedSession],
  );
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.postPublic<LoginResponse>("/auth/login", {
        email,
        password,
      });
      persistAuthSession(res);
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(() => {
    api.post("/auth/logout").catch(() => {});
    clearStoredAuthSession();
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
