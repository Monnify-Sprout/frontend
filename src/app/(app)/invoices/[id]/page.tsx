'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

import { InvoiceShare } from '@/components/invoice-share';
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
import { invoiceDetailResponseSchema } from '@/lib/schemas';
import { cn } from '@/lib/utils';

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const detail = useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const res = await api.get(`/api/invoices/${id}`);
      return invoiceDetailResponseSchema.parse(res.data);
    },
  });

  const invoice = detail.data?.invoice;
  const payment = detail.data?.payment;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          nativeButton={false}
          variant="ghost"
          size="icon-sm"
          aria-label="Back to invoices"
          render={
            <Link href="/invoices">
              <ArrowLeft />
            </Link>
          }
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice</h1>
          {invoice && (
            <p className="text-sm text-muted-foreground">
              {invoice.invoice_reference}
            </p>
          )}
        </div>
      </div>

      {detail.isPending ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading invoice…
          </CardContent>
        </Card>
      ) : detail.isError || !invoice ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            This invoice could not be loaded.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">
                    {formatNaira(invoice.amount)}
                  </CardTitle>
                  <CardDescription>
                    {invoice.customer_name}
                    {invoice.description ? ` · ${invoice.description}` : ''}
                  </CardDescription>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                    INVOICE_STATUS_STYLES[invoice.status],
                  )}
                >
                  {invoice.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd>{formatDate(invoice.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Due</dt>
                  <dd>{invoice.due_date ? formatDate(invoice.due_date) : 'None'}</dd>
                </div>
              </dl>
              {invoice.status === 'pending' && (
                <InvoiceShare invoice={invoice} />
              )}
            </CardContent>
          </Card>

          {payment && (
            <Card className="border-brand/30">
              <CardHeader>
                <CardTitle>Payment received</CardTitle>
                <CardDescription>
                  Confirmed by Monnify
                  {payment.paid_at ? ` on ${formatDate(payment.paid_at)}` : ''}
                  {payment.payment_method
                    ? ` via ${payment.payment_method.toLowerCase().replace(/_/g, ' ')}`
                    : ''}
                  .
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">Paid</dt>
                    <dd className="font-medium">{formatNaira(payment.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">You receive</dt>
                    <dd className="font-medium text-brand">
                      {payment.settlement_amount
                        ? formatNaira(payment.settlement_amount)
                        : 'Pending'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Sprout commission
                    </dt>
                    <dd className="font-medium">
                      {payment.commission_amount
                        ? formatNaira(payment.commission_amount)
                        : 'Pending'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
