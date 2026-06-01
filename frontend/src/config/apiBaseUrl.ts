const DEFAULT_DEV_URL = "http://localhost:8000";

function isLocalHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/** API base URL for axios. Production Netlify can use same-origin + proxy (see netlify.toml). */
export function getApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Built without VITE_API_URL: use same-origin; Netlify proxies /auth/* etc. to Railway
  if (import.meta.env.PROD && !isLocalHost()) {
    return "";
  }

  return DEFAULT_DEV_URL;
}

export function isMisconfiguredProductionApi(): boolean {
  if (!import.meta.env.PROD || isLocalHost()) return false;
  const url = getApiBaseUrl();
  return url.includes("localhost") || url.includes("127.0.0.1");
}
