'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Pause, Play, Sparkles } from 'lucide-react';
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
  formatDateTime,
  formatLinkAmount,
  formatNaira,
  PAYMENT_LINK_STATUS_STYLES,
} from '@/lib/format';
import {
  paymentLinkDetailResponseSchema,
  simulateCollectionResponseSchema,
  type PaymentLinkStatus,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
      </CardHeader>
    </Card>
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
      const body = buyerEntered ? { amount: Number(simAmount), customer_name: 'Test buyer' } : { customer_name: 'Test buyer' };
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment link</h1>
          {link && <p className="text-sm text-muted-foreground">{link.slug}</p>}
        </div>
      </div>

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
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{link.title}</CardTitle>
                  <CardDescription>
                    {formatLinkAmount(link.amount)}
                    {link.item ? ` · ${link.item}` : ''}
                    {link.category_name ? ` · ${link.category_name}` : ''}
                  </CardDescription>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                    PAYMENT_LINK_STATUS_STYLES[link.status],
                  )}
                >
                  {link.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Status actions: active <-> paused (reversible), then ended (terminal). */}
              {link.status !== 'ended' ? (
                <div className="flex flex-wrap gap-2">
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
              ) : (
                <p className="text-sm text-muted-foreground">
                  This link has ended and no longer accepts payments.
                </p>
              )}

              {setStatus.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {apiErrorMessage(setStatus.error)}
                </p>
              )}

              {link.status === 'active' ? (
                <LinkShare link={link} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {link.status === 'paused'
                    ? 'Paused: the shareable link shows a "temporarily unavailable" message and does not accept payments. Resume to start collecting again.'
                    : 'Ended: the shareable link no longer accepts payments.'}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total collected" value={formatNaira(stats.total_collected)} />
            <StatCard label="Collections" value={String(stats.collection_count)} />
            <StatCard label="Average" value={formatNaira(stats.average_amount)} />
            <StatCard
              label="Last paid"
              value={stats.last_paid_at ? formatDateTime(stats.last_paid_at) : 'None'}
            />
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

          <Card className="py-0">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">Collections</p>
              <p className="text-xs text-muted-foreground">
                Every payment received through this link
              </p>
            </div>
            {collections.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No collections yet. Share the link to start receiving payments.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
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
                          {c.settlement_amount ? formatNaira(c.settlement_amount) : 'Pending'}
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
