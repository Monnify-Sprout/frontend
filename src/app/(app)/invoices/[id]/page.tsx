'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

import { InvoiceDetailBody } from '@/components/invoice-detail-body';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { invoiceDetailResponseSchema } from '@/lib/schemas';

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
            <p className="text-sm text-muted-foreground">{invoice.invoice_reference}</p>
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
        <InvoiceDetailBody invoice={invoice} payment={payment ?? null} />
      )}
    </div>
  );
}
