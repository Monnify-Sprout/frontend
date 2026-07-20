'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  ArrowLeft,
  Ban,
  Calculator,
  Clock,
  Pause,
  Play,
  Sparkles,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';

import { LinkShare } from '@/components/link-share';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, apiErrorMessage } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  formatLinkAmount,
  formatNaira,
  PAYMENT_LINK_STATUS_STYLES,
} from '@/lib/format';
import {
  paymentLinkDetailResponseSchema,
  simulateCollectionResponseSchema,
  type PaymentLink,
  type PaymentLinkStatus,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

// Stat card in the dashboard's style: a soft tinted icon chip, muted label,
// large value. Mirrors the payment-links list summary cards so the detail page
// reads as the same surface, one level deeper.
function StatCard({
  icon: Icon,
  chipClass,
  label,
  value,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  chipClass: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="gap-3">
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-lg',
            chipClass,
          )}
        >
          <Icon className="size-5" />
        </span>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn('text-2xl font-semibold', valueClass)}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{children}</span>
    </div>
  );
}

function prettyMethod(method: string | null): string {
  if (!method) return 'Unknown';
  return method.toLowerCase().replace(/_/g, ' ');
}

export default function PaymentLinkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { merchant } = useAuthStore();
  const [simAmount, setSimAmount] = useState('');

  const detail = useQuery({
    queryKey: ['payment-links', id],
    queryFn: async () => {
      const res = await api.get(`/api/payment-links/${id}`);
      return paymentLinkDetailResponseSchema.parse(res.data);
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['payment-links'] });
    queryClient.invalidateQueries({ queryKey: ['payment-links', id] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const setStatus = useMutation({
    mutationFn: async (status: PaymentLinkStatus) => {
      await api.patch(`/api/payment-links/${id}/status`, { status });
    },
    onSuccess: invalidate,
  });

  const simulate = useMutation({
    mutationFn: async () => {
      const buyerEntered = detail.data?.link.amount == null;
      const body = buyerEntered
        ? { amount: Number(simAmount), customer_name: 'Test buyer' }
        : { customer_name: 'Test buyer' };
      const res = await api.post(`/api/payment-links/${id}/simulate-collection`, body);
      return simulateCollectionResponseSchema.parse(res.data);
    },
    onSuccess: () => {
      setSimAmount('');
      invalidate();
    },
  });

  const link = detail.data?.link;
  const stats = detail.data?.stats;
  const collections = detail.data?.collections ?? [];
  const isMock = merchant?.verification_mode === 'mock';
  const buyerEntered = link?.amount == null;
  const canSimulate =
    isMock &&
    link?.status !== 'ended' &&
    (!buyerEntered || Number(simAmount) > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header: back + title/status on the left, lifecycle actions on the right
          (like the list page's title row with its primary action). */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            nativeButton={false}
            variant="ghost"
            size="icon-sm"
            aria-label="Back to payment links"
            render={
              <Link href="/invoices/links">
                <ArrowLeft />
              </Link>
            }
          />
          <div className="min-w-0">
            {link ? (
              <>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-semibold tracking-tight">{link.title}</h1>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                      PAYMENT_LINK_STATUS_STYLES[link.status],
                    )}
                  >
                    {link.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatLinkAmount(link.amount)}
                  {link.item ? ` · ${link.item}` : ''}
                </p>
              </>
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight">Payment link</h1>
            )}
          </div>
        </div>

        {link && link.status !== 'ended' && (
          <div className="flex flex-wrap items-center gap-2">
            {link.status === 'active' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate('paused')}
              >
                <Pause data-icon="inline-start" />
                Pause
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate('active')}
              >
                <Play data-icon="inline-start" />
                Resume
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate('ended')}
            >
              <Ban data-icon="inline-start" />
              End link
            </Button>
          </div>
        )}
      </div>

      {setStatus.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(setStatus.error)}
        </p>
      )}

      {detail.isPending ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading payment link…
          </CardContent>
        </Card>
      ) : detail.isError || !link || !stats ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            This payment link could not be loaded.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat cards, mirroring the list page's summary row. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Wallet}
              chipClass="bg-brand/10 text-brand"
              label="Total collected"
              value={formatNaira(stats.total_collected)}
              valueClass="text-brand"
            />
            <StatCard
              icon={ArrowDownToLine}
              chipClass="bg-blue-100 text-blue-600"
              label="Collections"
              value={String(stats.collection_count)}
            />
            <StatCard
              icon={Calculator}
              chipClass="bg-violet-100 text-violet-600"
              label="Average payment"
              value={formatNaira(stats.average_amount)}
            />
            <StatCard
              icon={Clock}
              chipClass="bg-rose-100 text-rose-600"
              label="Last paid"
              value={stats.last_paid_at ? formatDate(stats.last_paid_at) : 'None yet'}
              valueClass="text-lg"
            />
          </div>

          {/* Share + details: the share block leads on wide screens, a compact
              detail list balances the right rail and stacks on mobile. */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Share this link</CardTitle>
                <CardDescription>
                  One reusable link that keeps collecting. Share it anywhere to take many
                  payments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {link.status === 'active' ? (
                  <LinkShare link={link} />
                ) : (
                  <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                    {link.status === 'paused'
                      ? 'Paused: the shareable link shows a "temporarily unavailable" message and does not accept payments. Resume to start collecting again.'
                      : 'Ended: this link no longer accepts payments and can no longer be resumed.'}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <LinkDetails link={link} />
              </CardContent>
            </Card>
          </div>

          {/* Demo/testing only (mock mode): make a collection land live. */}
          {isMock && link.status !== 'ended' && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Simulate a payment</CardTitle>
                <CardDescription>
                  Demo tool (mock mode): drop a test collection onto this link to see the
                  table and analytics update.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                {buyerEntered && (
                  <Input
                    inputMode="decimal"
                    placeholder="Amount"
                    className="h-10 w-32"
                    aria-label="Simulated amount"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canSimulate || simulate.isPending}
                  onClick={() => simulate.mutate()}
                >
                  <Sparkles data-icon="inline-start" />
                  {simulate.isPending ? 'Simulating…' : 'Simulate a payment'}
                </Button>
                {simulate.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {apiErrorMessage(simulate.error)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Collections table (full width), the primary record for this link. */}
          <Card className="py-0">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="text-sm font-medium">Collections</p>
                <p className="text-xs text-muted-foreground">
                  Every payment received through this link
                </p>
              </div>
              {collections.length > 0 && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {collections.length}{' '}
                  {collections.length === 1 ? 'payment' : 'payments'}
                </span>
              )}
            </div>
            {collections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ArrowDownToLine className="size-5" />
                </span>
                <p className="text-sm font-medium">No collections yet</p>
                <p className="text-sm text-muted-foreground">
                  Share the link to start receiving payments.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        You receive
                      </th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Method
                      </th>
                      <th className="px-4 py-3 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">
                          {c.customer_name ?? 'Customer'}
                        </td>
                        <td className="px-4 py-3 font-medium">{formatNaira(c.amount)}</td>
                        <td className="hidden px-4 py-3 text-brand sm:table-cell">
                          {c.settlement_amount
                            ? formatNaira(c.settlement_amount)
                            : 'Pending'}
                        </td>
                        <td className="hidden px-4 py-3 capitalize text-muted-foreground sm:table-cell">
                          {prettyMethod(c.payment_method)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.paid_at ? formatDateTime(c.paid_at) : 'Pending'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// Compact definition list for the right rail: the facts about the link that
// aren't already stat tiles.
function LinkDetails({ link }: { link: PaymentLink }) {
  return (
    <div className="flex flex-col">
      <DetailRow label="Price">{formatLinkAmount(link.amount)}</DetailRow>
      {link.item && <DetailRow label="Item">{link.item}</DetailRow>}
      <DetailRow label="Category">
        {link.category_name ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: link.category_color ?? undefined }}
            />
            {link.category_name}
          </span>
        ) : (
          <span className="text-muted-foreground">Uncategorised</span>
        )}
      </DetailRow>
      {link.stream_name && <DetailRow label="Stream">{link.stream_name}</DetailRow>}
      <DetailRow label="Created">{formatDate(link.created_at)}</DetailRow>
      <DetailRow label="Link">
        <span className="font-mono text-xs break-all">/link/{link.slug}</span>
      </DetailRow>
    </div>
  );
}
