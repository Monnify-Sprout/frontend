import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Phase 14/15: streams as the workspace scope. This store holds which stream the
// merchant is currently "on" (the header switcher sets it). It is injected as the
// `X-Stream-Id` header on every API request (src/lib/api.ts) so invoices,
// payment links and the dashboard are scoped to it. Mirrors the auth store's
// shape: persisted, with a `hydrated` gate and a reset on logout.
interface StreamState {
  activeStreamId: string | null;
  // True once the persisted value has been read back from localStorage, so the
  // switcher can wait before deciding the active stream.
  hydrated: boolean;
  setActiveStream: (id: string) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useStreamStore = create<StreamState>()(
  persist(
    (set) => ({
      activeStreamId: null,
      hydrated: false,
      setActiveStream: (id) => set({ activeStreamId: id }),
      clear: () => set({ activeStreamId: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'sprout-stream',
      partialize: (state) => ({ activeStreamId: state.activeStreamId }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
