'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock, Plus, ReceiptText, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  customerLabel,
  formatDate,
  formatDateTime,
  formatNaira,
  INVOICE_STATUS_STYLES,
} from '@/lib/format';
import {
  listInvoicesResponseSchema,
  meResponseSchema,
  type InvoiceStatus,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const STATUS_FILTERS: Array<'all' | InvoiceStatus> = [
  'all',
  'pending',
  'paid',
  'expired',
  'cancelled',
];

// Shown to merchants who are not Active yet: invoice creation stays out of
// reach until verification completes (Phase 6 acceptance).
function LockedState() {
  return (
    <Card>
      <CardHeader className="items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Lock className="size-6" />
        </span>
        <CardTitle className="text-xl">Invoicing is locked</CardTitle>
        <CardDescription>
          Only verified, active merchants can create invoices. Verify your BVN or NIN to
          unlock payments.
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

export default function InvoicesPage() {
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

  const invoices = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/api/invoices');
      return listInvoicesResponseSchema.parse(res.data).invoices;
    },
    enabled: active,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  const filtered = useMemo(() => {
    const items = invoices.data ?? [];
    const q = search.trim().toLowerCase();
    return items.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        inv.customer_name,
        inv.customer_social_handle,
        inv.customer_phone,
        inv.customer_email,
        inv.item,
        inv.invoice_reference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [invoices.data, search, statusFilter]);

  if (!merchant) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create an invoice and share the payment details with your customer.
          </p>
        </div>
        {active && (
          <Button
            nativeButton={false}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            render={
              <Link href="/invoices/new">
                <Plus data-icon="inline-start" />
                New invoice
              </Link>
            }
          />
        )}
      </div>

      {!active ? (
        <LockedState />
      ) : invoices.isPending ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading invoices…
          </CardContent>
        </Card>
      ) : invoices.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Your invoices could not be loaded. Refresh to try again.
          </CardContent>
        </Card>
      ) : (invoices.data?.length ?? 0) === 0 ? (
        <Card>
          <CardHeader className="items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ReceiptText className="size-6" />
            </span>
            <CardTitle className="text-xl">No invoices yet</CardTitle>
            <CardDescription>
              Your first invoice generates a virtual account and checkout link your
              customer can pay into.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, item, or reference"
                className="h-10 pl-9"
                aria-label="Search invoices"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                    statusFilter === s
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-input text-muted-foreground hover:bg-muted',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No invoices match your search.
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Due</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b last:border-0 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-medium text-foreground hover:text-brand"
                          >
                            {customerLabel(inv)}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {inv.item ?? inv.invoice_reference}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatNaira(inv.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                              INVOICE_STATUS_STYLES[inv.status],
                            )}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {inv.due_date ? formatDate(inv.due_date) : 'None'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {formatDateTime(inv.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
