import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Merchant } from '@/lib/schemas';

interface AuthState {
  token: string | null;
  merchant: Merchant | null;
  // True once the persisted state has been read back from localStorage. Route
  // guards must wait for this before deciding a user is logged out, or a page
  // refresh would bounce an authenticated user to /login.
  hydrated: boolean;
  setSession: (token: string, merchant: Merchant) => void;
  setMerchant: (merchant: Merchant) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      merchant: null,
      hydrated: false,
      setSession: (token, merchant) => set({ token, merchant }),
      setMerchant: (merchant) => set({ merchant }),
      clear: () => set({ token: null, merchant: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'sprout-auth',
      partialize: (state) => ({
        token: state.token,
        merchant: state.merchant,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
