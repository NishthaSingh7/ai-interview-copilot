const DEFAULT_DEV_URL = "http://localhost:8000";

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/**
 * Dev: VITE_API_URL or localhost:8000.
 * Production (Netlify): same-origin — netlify.toml proxies /auth/* etc. to Railway.
 */
export function getApiBaseUrl(): string {
  if (!import.meta.env.PROD || isLocalHost()) {
    const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    return DEFAULT_DEV_URL;
  }

  return "";
}

export function isMisconfiguredProductionApi(): boolean {
  return false;
}
