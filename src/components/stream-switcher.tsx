'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Landmark, Plus, Settings2, Waypoints } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { listStreamsResponseSchema, type Stream } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useStreamStore } from '@/store/stream';

// Phase 14/15: the workspace switcher (the Supabase-organization pattern). Sets
// which stream every scoped screen is showing. Deliberately invisible until a
// second stream exists: with a single stream the header looks exactly as it did
// before streams were a workspace (business name + email), honouring "one stream
// = the app is unchanged".
export const MAX_STREAMS = 3;

export function StreamSwitcher() {
  const merchant = useAuthStore((s) => s.merchant);
  const activeStreamId = useStreamStore((s) => s.activeStreamId);
  const setActiveStream = useStreamStore((s) => s.setActiveStream);
  const streamHydrated = useStreamStore((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const streamsQuery = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const res = await api.get('/api/streams');
      return listStreamsResponseSchema.parse(res.data).streams;
    },
    enabled: Boolean(merchant),
  });

  const streamsData = streamsQuery.data;
  const streams = useMemo(() => streamsData ?? [], [streamsData]);
  const current =
    streams.find((s) => s.id === activeStreamId && s.status === 'active') ?? null;

  // Resolve the active stream once streams load: if none is set, or the stored
  // one is gone or archived, fall back to the default ("<business> - Main").
  useEffect(() => {
    if (!streamHydrated || streams.length === 0) return;
    const stillValid = streams.some(
      (s) => s.id === activeStreamId && s.status === 'active',
    );
    if (!stillValid) {
      const fallback =
        streams.find((s) => s.is_default) ??
        streams.find((s) => s.status === 'active');
      if (fallback && fallback.id !== activeStreamId) {
        setActiveStream(fallback.id);
      }
    }
  }, [streamHydrated, streams, activeStreamId, setActiveStream]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // One stream (or still loading): show the original business identity block, so
  // the single-stream app is visually unchanged.
  if (streams.length <= 1) {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{merchant?.business_name}</p>
        <p className="truncate text-xs text-muted-foreground">{merchant?.email}</p>
      </div>
    );
  }

  const select = (stream: Stream) => {
    if (stream.status !== 'active') return;
    setActiveStream(stream.id);
    setOpen(false);
  };

  const atCap = streams.length >= MAX_STREAMS;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-w-0 max-w-[16rem] items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-left hover:bg-muted"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
          <Waypoints className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium leading-tight">
            {current?.name ?? 'Select a stream'}
          </span>
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {merchant?.business_name}
          </span>
        </span>
        <ChevronsUpDown className="ml-1 size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+0.375rem)] z-30 w-72 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Streams
          </p>
          <ul className="flex flex-col">
            {streams.map((s) => {
              const isActive = s.id === current?.id;
              const archived = s.status === 'archived';
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={archived}
                    onClick={() => select(s)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm',
                      archived
                        ? 'cursor-not-allowed text-muted-foreground/70'
                        : 'hover:bg-muted',
                      isActive && 'bg-brand/10 text-brand',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    {s.sub_account_code && (
                      <Landmark className="size-3.5 shrink-0 text-muted-foreground" aria-label="Routed" />
                    )}
                    {archived && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        Archived
                      </span>
                    )}
                    {isActive && <Check className="size-4 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="my-1.5 h-px bg-border" />
          <Link
            href="/streams"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Settings2 className="size-4 text-muted-foreground" />
            Manage streams
          </Link>
          <Link
            href="/streams"
            aria-disabled={atCap}
            onClick={(e) => {
              if (atCap) e.preventDefault();
              else setOpen(false);
            }}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
              atCap
                ? 'cursor-not-allowed text-muted-foreground/60'
                : 'hover:bg-muted',
            )}
          >
            <Plus className="size-4 text-muted-foreground" />
            {atCap ? `Stream limit reached (${MAX_STREAMS})` : 'New stream'}
          </Link>
        </div>
      )}
    </div>
  );
}
