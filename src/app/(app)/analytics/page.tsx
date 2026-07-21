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
  listStreamsResponseSchema,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useStreamStore } from '@/store/stream';

const WINDOWS = [7, 30, 90] as const;

// 'merchant' = the merchant's own Sprout sales; otherwise a connected account id.
type Scope = { kind: 'merchant' } | { kind: 'connected'; id: string; label: string };

// Phase 15: for the merchant's own sales, analytics can show just the current
// workspace stream or every stream aggregated. Connected accounts are never
// stream-scoped.
type StreamMode = 'this' | 'all';

export default function AnalyticsPage() {
  const [scope, setScope] = useState<Scope>({ kind: 'merchant' });
  const [days, setDays] = useState<number>(30);
  const [streamMode, setStreamMode] = useState<StreamMode>('this');
  const activeStreamId = useStreamStore((s) => s.activeStreamId);

  const connected = useQuery({
    queryKey: ['connected-accounts'],
    queryFn: async () => {
      const res = await api.get('/api/connected-accounts');
      return listConnectedAccountsResponseSchema.parse(res.data).accounts;
    },
  });

  const streams = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const res = await api.get('/api/streams');
      return listStreamsResponseSchema.parse(res.data).streams;
    },
  });

  const connectedId = scope.kind === 'connected' ? scope.id : null;
  const isMerchant = scope.kind === 'merchant';
  // The stream toggle only makes sense for the merchant's own sales, and only
  // once a second stream exists (with one stream "This" and "All" are identical).
  const multiStream = (streams.data?.length ?? 0) > 1;
  const showStreamToggle = isMerchant && multiStream;
  // Scope to the active stream only when in merchant + "this" mode with a
  // resolved stream; otherwise aggregate every stream.
  const scopedStreamId =
    isMerchant && streamMode === 'this' && multiStream ? activeStreamId : null;

  const analytics = useQuery({
    queryKey: [
      'analytics',
      connectedId ?? 'merchant',
      days,
      connectedId ? null : (scopedStreamId ?? 'all'),
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (connectedId) params.set('connected_account_id', connectedId);
      else if (scopedStreamId) params.set('stream_id', scopedStreamId);
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

      {/* Stream scope (merchant, multi-stream only): this stream vs all. */}
      {showStreamToggle && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Streams
          </span>
          <button
            type="button"
            onClick={() => setStreamMode('this')}
            aria-pressed={streamMode === 'this'}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              streamMode === 'this'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            This stream
          </button>
          <button
            type="button"
            onClick={() => setStreamMode('all')}
            aria-pressed={streamMode === 'all'}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              streamMode === 'all'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            All streams
          </button>
        </div>
      )}

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
        <AnalyticsSkeleton />
      ) : analytics.isError || !analytics.data ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-destructive">
            Analytics could not be loaded.
          </CardContent>
        </Card>
      ) : (
        <AnalyticsView
          data={analytics.data}
          hideByStream={Boolean(scopedStreamId)}
        />
      )}
    </div>
  );
}

// Mirrors AnalyticsView's layout (3 stat tiles, trend, 3 breakdowns) so the
// switch to real data doesn't reflow the page.
function AnalyticsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading analytics"
      className="flex animate-pulse flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border bg-muted/40" />
        ))}
      </div>
      <div className="h-56 rounded-xl border bg-muted/40" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 rounded-xl border bg-muted/40" />
        ))}
      </div>
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
