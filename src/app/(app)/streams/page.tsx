'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Waypoints } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_STREAMS } from '@/components/stream-switcher';
import { api, apiErrorMessage } from '@/lib/api';
import { BANKS, bankName } from '@/lib/banks';
import { formatNaira } from '@/lib/format';
import {
  streamFormSchema,
  streamResponseSchema,
  listStreamsResponseSchema,
  type Stream,
  type StreamForm,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useStreamStore } from '@/store/stream';

// What the API receives from the form (the form-only `routed` flag resolved
// into the optional settlement fields, plus clear_settlement on edits).
interface StreamPayload {
  name: string;
  settlement_bank_code?: string;
  settlement_bank_name?: string;
  settlement_account_number?: string;
  settlement_account_name?: string;
  clear_settlement?: boolean;
}

function toPayload(input: StreamForm, wasRouted: boolean): StreamPayload {
  if (!input.routed) {
    // On an edit of a previously-routed stream, un-ticking the toggle detaches
    // the account; on a create it simply sends nothing.
    return { name: input.name, ...(wasRouted ? { clear_settlement: true } : {}) };
  }
  return {
    name: input.name,
    settlement_bank_code: input.settlement_bank_code,
    settlement_bank_name: bankName(input.settlement_bank_code) ?? undefined,
    settlement_account_number: input.settlement_account_number,
    settlement_account_name: input.settlement_account_name,
  };
}

// Inline editor shared by the create form and per-row edit. Local draft state;
// the "Settles to its own account" toggle reveals the settlement fields.
function StreamEditor({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Stream;
  submitLabel: string;
  pending: boolean;
  error?: string;
  onSubmit: (input: StreamForm) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [routed, setRouted] = useState(Boolean(initial?.sub_account_code));
  const [bankCode, setBankCode] = useState(initial?.settlement_bank_code ?? '');
  const [accountNumber, setAccountNumber] = useState(
    initial?.settlement_account_number ?? '',
  );
  const [accountName, setAccountName] = useState(
    initial?.settlement_account_name ?? '',
  );
  const [invalid, setInvalid] = useState<string | null>(null);

  const submit = () => {
    const parsed = streamFormSchema.safeParse({
      name,
      routed,
      settlement_bank_code: bankCode,
      settlement_account_number: accountNumber,
      settlement_account_name: accountName,
    });
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'Check the details');
      return;
    }
    setInvalid(null);
    onSubmit(parsed.data);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <Label htmlFor="stream-name">Name</Label>
        <Input
          id="stream-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ikeja shop, Instagram, Tunde (rep)"
          className="h-11"
          maxLength={60}
          aria-invalid={!!invalid}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
      </Field>

      {/* Clicking anywhere in this label toggles the checkbox, so the whole
          block reads as interactive. */}
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={routed}
          onChange={(e) => setRouted(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--brand)]"
        />
        <span>
          <span className="font-medium">Settles to its own account</span>
          <span className="block text-xs text-muted-foreground">
            Money from this stream is routed to a separate bank account instead of
            your main settlement account.
          </span>
        </span>
      </label>

      {routed && (
        <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
          <Field>
            <Label htmlFor="stream-bank">Bank</Label>
            <select
              id="stream-bank"
              className="h-11 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
            >
              <option value="">Select a bank</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label htmlFor="stream-account-number">Account number</Label>
            <Input
              id="stream-account-number"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digits"
              className="h-11"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="stream-account-name">
              Account name{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="stream-account-name"
              placeholder="As it appears at the bank"
              className="h-11"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </Field>
        </div>
      )}

      {(invalid || error) && <FieldError>{invalid ?? error}</FieldError>}

      <div className="flex gap-2">
        <Button
          type="button"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={pending}
          onClick={submit}
        >
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function StreamRow({
  stream,
  onEdit,
}: {
  stream: Stream;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const archived = stream.status === 'archived';
  const activeStreamId = useStreamStore((s) => s.activeStreamId);
  const setActiveStream = useStreamStore((s) => s.setActiveStream);
  const isCurrent = stream.id === activeStreamId;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['streams'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['payment-links'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const setStatus = useMutation({
    mutationFn: async (status: 'active' | 'archived') => {
      const res = await api.patch(`/api/streams/${stream.id}/status`, { status });
      return streamResponseSchema.parse(res.data).stream;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/streams/${stream.id}`);
    },
    onSuccess: () => {
      setConfirmingDelete(false);
      invalidate();
    },
  });

  const usage = [
    `${stream.invoice_count ?? 0} ${(stream.invoice_count ?? 0) === 1 ? 'invoice' : 'invoices'}`,
    `${stream.link_count ?? 0} ${(stream.link_count ?? 0) === 1 ? 'link' : 'links'}`,
    `${formatNaira(stream.total_collected ?? 0)} collected`,
  ].join(' · ');
  const unused = (stream.invoice_count ?? 0) === 0 && (stream.link_count ?? 0) === 0;

  return (
    <Card className={cn(archived && 'opacity-70')}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">{stream.name}</span>
            {stream.is_default && (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">
                Main
              </span>
            )}
            {isCurrent && !archived && (
              <span className="rounded-full border border-brand/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">
                Current
              </span>
            )}
            {archived && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Archived
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{usage}</p>
          {stream.sub_account_code ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-brand">
              <Landmark className="size-3.5" aria-hidden />
              Settles to {stream.settlement_bank_name ?? 'its own account'}
              {stream.settlement_account_number
                ? ` ····${stream.settlement_account_number.slice(-4)}`
                : ''}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Settles to your main account
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {confirmingDelete ? (
            <>
              <span className="text-xs text-muted-foreground">Delete?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {/* Switch the workspace to this stream (the header switcher does the
                  same). Not offered for an archived stream - you can't be "on"
                  one - or the stream you are already on. */}
              {!archived && !isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand/40 text-brand hover:bg-brand/10"
                  onClick={() => setActiveStream(stream.id)}
                >
                  Switch to
                </Button>
              )}
              {!archived && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {/* The default "Main" stream is always active and cannot be
                  archived or deleted (the backend rejects both). */}
              {!stream.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate(archived ? 'active' : 'archived')}
                >
                  {archived ? 'Restore' : 'Archive'}
                </Button>
              )}
              {!stream.is_default && unused && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
        {remove.isError && (
          <p className="w-full text-xs text-destructive">
            {apiErrorMessage(remove.error)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function StreamsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const streams = useQuery({
    queryKey: ['streams'],
    queryFn: async () => {
      const res = await api.get('/api/streams');
      return listStreamsResponseSchema.parse(res.data).streams;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['streams'] });
    // A rename changes how invoices/links/analytics render their stream.
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['payment-links'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const create = useMutation({
    mutationFn: async (input: StreamForm) => {
      const res = await api.post('/api/streams', toPayload(input, false));
      return streamResponseSchema.parse(res.data).stream;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ stream, input }: { stream: Stream; input: StreamForm }) => {
      const res = await api.patch(
        `/api/streams/${stream.id}`,
        toPayload(input, Boolean(stream.sub_account_code)),
      );
      return streamResponseSchema.parse(res.data).stream;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const list = streams.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Streams</h1>
        <p className="text-sm text-muted-foreground">
          A stream is a workspace for part of your business - your main account plus,
          if you split things up, a branch, a second brand, or a pop-up (each can
          settle to its own bank account). Switch between them from the header; your
          invoices, links, dashboard and analytics all follow the stream you are on.
        </p>
      </div>

      {streams.isPending ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading streams…
          </CardContent>
        </Card>
      ) : streams.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Streams could not be loaded. Refresh to try again.
          </CardContent>
        </Card>
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((s) =>
            editingId === s.id ? (
              <Card key={s.id}>
                <CardContent>
                  <StreamEditor
                    initial={s}
                    submitLabel="Save changes"
                    pending={update.isPending}
                    error={update.isError ? apiErrorMessage(update.error) : undefined}
                    onSubmit={(input) => update.mutate({ stream: s, input })}
                    onCancel={() => setEditingId(null)}
                  />
                </CardContent>
              </Card>
            ) : (
              <StreamRow key={s.id} stream={s} onEdit={() => setEditingId(s.id)} />
            ),
          )}
          <p className="text-xs text-muted-foreground">
            Archiving hides a stream from new invoices and links but keeps its history.
            Only an unused stream can be deleted.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader className="items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Waypoints className="size-6" />
            </span>
            <CardTitle className="text-xl">No streams yet</CardTitle>
            <CardDescription>
              Create your first stream below, then pick it when you raise an invoice or
              share a payment link.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {list.length >= MAX_STREAMS ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            You have reached the limit of {MAX_STREAMS} streams. Delete one to add
            another. Create a stream only when you want a separate account for part of
            your business.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Waypoints className="size-5 text-brand" />
              <CardTitle className="text-base">New stream</CardTitle>
            </div>
            <CardDescription>
              Create a stream for a separate part of your business (a branch, a
              second brand, a pop-up) - especially one that settles to its own bank
              account. Up to {MAX_STREAMS} in total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* key remounts the editor (clearing it) after each successful create. */}
            <StreamEditor
              key={create.isSuccess ? create.data?.id : 'new'}
              submitLabel="Add stream"
              pending={create.isPending}
              error={create.isError ? apiErrorMessage(create.error) : undefined}
              onSubmit={(input) => create.mutate(input)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
