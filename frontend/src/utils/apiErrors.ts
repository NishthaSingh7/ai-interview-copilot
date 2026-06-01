import axios from "axios";
import { isMisconfiguredProductionApi } from "../config/apiBaseUrl";

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return fallback;
  }

  if (!err.response) {
    if (isMisconfiguredProductionApi()) {
      return "Cannot reach the API. In Netlify: set VITE_API_URL to your Railway URL (no trailing slash), then Deploy → Clear cache and deploy.";
    }
    if (err.code === "ERR_NETWORK" || err.message.includes("Network Error")) {
      return "Cannot reach the server. Check that the backend is running and try again.";
    }
    return "Cannot reach the server. Please try again.";
  }

  const detail = err.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (typeof detail === "object" && detail !== null && "message" in detail) {
    const msg = (detail as { message?: string }).message;
    if (typeof msg === "string") return msg;
  }

  return fallback;
}
