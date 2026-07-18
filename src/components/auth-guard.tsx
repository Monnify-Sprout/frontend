'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth';

// Client-side gate for authenticated routes: waits for the persisted session to
// rehydrate (so a refresh doesn't bounce a logged-in user), then redirects to
// /login when there is no session.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div
          aria-label="Loading"
          className="size-6 animate-spin rounded-full border-2 border-muted border-t-brand"
        />
      </div>
    );
  }

  return <>{children}</>;
}
