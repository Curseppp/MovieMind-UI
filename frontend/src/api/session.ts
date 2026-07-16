import type { TokenResponse } from "../types";

let refreshRequest: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshRequest) return refreshRequest;

  refreshRequest = fetch("/auth/refresh", { method: "POST" })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as TokenResponse;
      return payload.access_token;
    })
    .catch(() => null)
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

