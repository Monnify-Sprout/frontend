'use client';

import { useQuery } from '@tanstack/react-query';
import { Landmark } from 'lucide-react';
import Link from 'next/link';

import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { listStreamsResponseSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// Pill picker for the optional revenue stream on the invoice and payment-link
// forms (Phase 13) - "where is this sale coming from?". Mirrors the category
// picker's None + pills pattern; a routed stream (one settling to its own
// account) carries a small bank icon so the merchant knows money will follow.
export function StreamPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (streamId: string) => void;
}) {
  const streams = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const res = await api.get('/api/streams');
      return listStreamsResponseSchema.parse(res.data).streams;
    },
  });

  // Only active streams are assignable (the backend rejects archived ones).
  const assignable = (streams.data ?? []).filter((s) => s.status === 'active');

  return (
    <Field>
      <div className="flex items-center justify-between">
        <Label htmlFor="stream-picker">
          Stream <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Link href="/streams" className="text-xs font-medium text-brand hover:underline">
          Manage
        </Link>
      </div>
      {assignable.length > 0 ? (
        <div
          id="stream-picker"
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Stream"
        >
          <button
            type="button"
            aria-pressed={!value}
            onClick={() => onChange('')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              !value
                ? 'border-brand bg-brand text-brand-foreground'
                : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            None
          </button>
          {assignable.map((s) => {
            const selected = value === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(s.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  selected
                    ? 'border-brand bg-brand text-brand-foreground'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {s.sub_account_code && <Landmark className="size-3.5" aria-hidden />}
                {s.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No streams yet.{' '}
          <Link href="/streams" className="text-brand hover:underline">
            Create one
          </Link>{' '}
          to track where sales come from - a shop, a page, a stall, a rep.
        </p>
      )}
    </Field>
  );
}
