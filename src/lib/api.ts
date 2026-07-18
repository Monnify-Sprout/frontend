import axios from 'axios';

import { apiErrorSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

// Same-origin by default - next.config.ts rewrites /api/* to the backend, so no
// CORS is involved. Point NEXT_PUBLIC_API_BASE_URL elsewhere to skip the proxy.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
});

// The Zustand store is the single source of truth for the session (Phase 5);
// getState() keeps this usable outside React (interceptors, query fns).
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Expired/invalid session - clear it; route guards handle the redirect.
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  },
);

// Extracts the backend's { error, details? } message from an axios failure,
// falling back to a generic line for network-level errors.
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    const parsed = apiErrorSchema.safeParse(error.response.data);
    if (parsed.success) {
      const detail = parsed.data.details?.[0];
      return detail ? `${parsed.data.error}: ${detail.message}` : parsed.data.error;
    }
  }
  return 'Something went wrong. Check your connection and try again.';
}
