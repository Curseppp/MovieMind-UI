import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { responseError, translateError } from "../api/errors";
import { refreshAccessToken } from "../api/session";
import type {
  AuthStatus,
  RegisterPayload,
  TokenResponse,
} from "../types";

interface AuthContextValue {
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: (
    path: string,
    options?: RequestInit,
    protectedRequest?: boolean,
  ) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("booting");
  const accessToken = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void refreshAccessToken().then((token) => {
      if (!active) return;
      accessToken.current = token;
      setStatus(token ? "authenticated" : "unauthenticated");
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password });
    const response = await fetch("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new Error(translateError(await responseError(response)));
    }
    const payload = (await response.json()) as TokenResponse;
    accessToken.current = payload.access_token;
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(translateError(await responseError(response)));
      }
      await login(payload.email, payload.password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
    } finally {
      accessToken.current = null;
      setStatus("unauthenticated");
    }
  }, []);

  const apiFetch = useCallback(
    async (
      path: string,
      options: RequestInit = {},
      protectedRequest = false,
    ): Promise<Response> => {
      const send = (token: string | null) => {
        const headers = new Headers(options.headers);
        if (protectedRequest && token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return fetch(path, { ...options, headers });
      };

      let response = await send(accessToken.current);
      if (protectedRequest && response.status === 401) {
        const token = await refreshAccessToken();
        accessToken.current = token;
        if (token) {
          response = await send(token);
        } else {
          setStatus("unauthenticated");
        }
      }
      return response;
    },
    [],
  );

  const value = useMemo(
    () => ({ status, login, register, logout, apiFetch }),
    [status, login, register, logout, apiFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

