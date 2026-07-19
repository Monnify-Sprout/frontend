'use client';

import { useQuery } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AnalyticsView } from '@/components/analytics-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  analyticsResponseSchema,
  listConnectedAccountsResponseSchema,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';

const WINDOWS = [7, 30, 90] as const;

// 'merchant' = the merchant's own Sprout sales; otherwise a connected account id.
type Scope = { kind: 'merchant' } | { kind: 'connected'; id: string; label: string };

export default function AnalyticsPage() {
  const [scope, setScope] = useState<Scope>({ kind: 'merchant' });
  const [days, setDays] = useState<number>(30);

  const connected = useQuery({
    queryKey: ['connected-accounts'],
    queryFn: async () => {
      const res = await api.get('/api/connected-accounts');
      return listConnectedAccountsResponseSchema.parse(res.data).accounts;
    },
  });

  const connectedId = scope.kind === 'connected' ? scope.id : null;

  const analytics = useQuery({
    queryKey: ['analytics', connectedId ?? 'merchant', days],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (connectedId) params.set('connected_account_id', connectedId);
      const res = await api.get(`/api/analytics?${params.toString()}`);
      return analyticsResponseSchema.parse(res.data);
    },
  });

  const accounts = connected.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Your Sprout sales, and any Monnify account you connect, in one view.
        </p>
      </div>

      {/* Scope: my sales vs each connected account. */}
      <div className="flex flex-wrap items-center gap-2">
        <ScopePill
          active={scope.kind === 'merchant'}
          onClick={() => setScope({ kind: 'merchant' })}
        >
          My sales
        </ScopePill>
        {accounts.map((a) => (
          <ScopePill
            key={a.id}
            active={connectedId === a.id}
            onClick={() =>
              setScope({ kind: 'connected', id: a.id, label: a.business_name })
            }
          >
            {a.business_name}
          </ScopePill>
        ))}
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          render={
            <Link href="/connected">
              <Link2 data-icon="inline-start" />
              Connect an account
            </Link>
          }
        />
      </div>

      {/* Time window. */}
      <div className="flex gap-2">
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setDays(w)}
            aria-pressed={days === w}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              days === w
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            {w} days
          </button>
        ))}
      </div>

      {analytics.isPending ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading analytics…
          </CardContent>
        </Card>
      ) : analytics.isError || !analytics.data ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            Analytics could not be loaded.
          </CardContent>
        </Card>
      ) : (
        <AnalyticsView data={analytics.data} />
      )}
    </div>
  );
}

function ScopePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'max-w-[12rem] truncate rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand bg-brand text-brand-foreground'
          : 'border-input text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}
