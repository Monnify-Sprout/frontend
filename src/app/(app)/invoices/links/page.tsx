'use client';

import { useQuery } from '@tanstack/react-query';
import { Link2, Lock, Plus } from 'lucide-react';
import Link from 'next/link';

import { InvoiceTabs } from '@/components/invoice-tabs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  formatDateTime,
  formatLinkAmount,
  formatNaira,
  PAYMENT_LINK_STATUS_STYLES,
} from '@/lib/format';
import {
  listPaymentLinksResponseSchema,
  meResponseSchema,
  type LinkStatusSummary,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

// Non-active merchants can't collect yet: link creation stays locked until
// verification completes, exactly like invoices.
function LockedState() {
  return (
    <Card>
      <CardHeader className="items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Lock className="size-6" />
        </span>
        <CardTitle className="text-xl">Payment links are locked</CardTitle>
        <CardDescription>
          Only verified, active merchants can create payment links. Verify your BVN or
          NIN to unlock collections.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button
          nativeButton={false}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          render={<Link href="/verify">Verify your identity</Link>}
        />
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn('text-2xl font-semibold', valueClass)}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SummaryCards({ summary }: { summary: LinkStatusSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <SummaryCard label="Total links" value={String(summary.total)} />
      <SummaryCard label="Active" value={String(summary.active)} valueClass="text-brand" />
      <SummaryCard label="Paused" value={String(summary.paused)} />
      <SummaryCard label="Ended" value={String(summary.ended)} />
      <SummaryCard
        label="Total collected"
        value={formatNaira(summary.total_collected)}
      />
    </div>
  );
}

export default function PaymentLinksPage() {
  const { merchant: cached, setMerchant } = useAuthStore();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/me');
      const parsed = meResponseSchema.parse(res.data);
      setMerchant(parsed.merchant);
      return parsed.merchant;
    },
  });
  const merchant = me.data ?? cached;
  const active = merchant?.status === 'active';

  const links = useQuery({
    queryKey: ['payment-links'],
    queryFn: async () => {
      const res = await api.get('/api/payment-links');
      return listPaymentLinksResponseSchema.parse(res.data);
    },
    enabled: active,
  });

  if (!merchant) return null;

  const total = links.data?.links.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <InvoiceTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment links</h1>
          <p className="text-sm text-muted-foreground">
            One reusable link that keeps collecting: share it anywhere and take many
            payments.
          </p>
        </div>
        {active && (
          <Button
            nativeButton={false}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            render={
              <Link href="/invoices/links/new">
                <Plus data-icon="inline-start" />
                New payment link
              </Link>
            }
          />
        )}
      </div>

      {!active ? (
        <LockedState />
      ) : links.isPending ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading payment links…
          </CardContent>
        </Card>
      ) : links.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Your payment links could not be loaded. Refresh to try again.
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryCards summary={links.data.summary} />

          {total === 0 ? (
            <Card>
              <CardHeader className="items-center gap-3 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Link2 className="size-6" />
                </span>
                <CardTitle className="text-xl">No payment links yet</CardTitle>
                <CardDescription>
                  Create a reusable link with a fixed price or a buyer-entered amount,
                  then share it to start collecting.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card className="py-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Link</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Collections
                      </th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Collected
                      </th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.data.links.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/invoices/links/${l.id}`}
                            className="font-medium text-foreground hover:text-brand"
                          >
                            {l.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>{l.item ?? l.slug}</span>
                            {l.category_name && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium text-foreground">
                                <span
                                  className="size-2 rounded-full ring-1 ring-black/10"
                                  style={{
                                    backgroundColor: l.category_color ?? undefined,
                                  }}
                                />
                                {l.category_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatLinkAmount(l.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                              PAYMENT_LINK_STATUS_STYLES[l.status],
                            )}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {l.collection_count ?? 0}
                        </td>
                        <td className="hidden px-4 py-3 font-medium sm:table-cell">
                          {formatNaira(l.total_collected ?? '0')}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {formatDateTime(l.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
