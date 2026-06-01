import axios, { type AxiosError } from "axios";
import { getApiBaseUrl } from "../config/apiBaseUrl";
import { getOrCreateClientId } from "../utils/clientId";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Client-Id"] = getOrCreateClientId();
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && onUnauthorized) {
      const url = error.config?.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);

export type UsageToday = {
  usage_date: string;
  interviews_used_today: number;
  interviews_allowed_per_day: number;
  can_start_interview: boolean;
  limit_message?: string | null;
  next_reset_note: string;
};

export async function fetchUsageToday(): Promise<UsageToday> {
  const res = await api.get<UsageToday>("/auth/usage/today");
  return res.data;
}
