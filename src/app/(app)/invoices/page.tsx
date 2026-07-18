'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock, Plus, ReceiptText } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate, formatNaira, INVOICE_STATUS_STYLES } from '@/lib/format';
import { listInvoicesResponseSchema, meResponseSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

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
          Only verified, active merchants can create invoices. Verify your BVN
          or NIN to unlock payments.
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
      ) : (invoices.data?.length ?? 0) === 0 ? (
        <Card>
          <CardHeader className="items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ReceiptText className="size-6" />
            </span>
            <CardTitle className="text-xl">No invoices yet</CardTitle>
            <CardDescription>
              Your first invoice generates a virtual account and checkout link
              your customer can pay into.
            </CardDescription>
          </CardHeader>
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
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Due
                  </th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.data!.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-foreground hover:text-brand"
                      >
                        {inv.customer_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {inv.invoice_reference}
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
                      {formatDate(inv.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
