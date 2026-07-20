'use client';

import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

import { InvoiceDetailBody } from '@/components/invoice-detail-body';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api } from '@/lib/api';
import { invoiceDetailResponseSchema } from '@/lib/schemas';

// The invoice detail rendered in a right slide-over instead of navigating to
// the full page. It reuses the SAME ['invoices', id] query as
// /invoices/[id], so opening the full page from here is instant (shared cache)
// and both surfaces render the identical InvoiceDetailBody.
export function InvoiceSheet({
  invoiceId,
  open,
  onOpenChange,
}: {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: async () => {
      const res = await api.get(`/api/invoices/${invoiceId}`);
      return invoiceDetailResponseSchema.parse(res.data);
    },
    enabled: open && Boolean(invoiceId),
  });

  const invoice = detail.data?.invoice;
  const payment = detail.data?.payment;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Invoice</SheetTitle>
          <SheetDescription>
            {invoice?.invoice_reference ?? 'Invoice details'}
          </SheetDescription>
        </SheetHeader>

        {detail.isPending ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Loading invoice…
          </p>
        ) : detail.isError || !invoice ? (
          <p className="py-10 text-center text-sm text-destructive">
            This invoice could not be loaded.
          </p>
        ) : (
          <InvoiceDetailBody invoice={invoice} payment={payment ?? null} />
        )}

        <SheetFooter>
          <SheetClose
            render={
              <Button variant="ghost" size="lg">
                Close
              </Button>
            }
          />
          {invoiceId && (
            <Button
              nativeButton={false}
              variant="outline"
              size="lg"
              render={
                <Link href={`/invoices/${invoiceId}`}>
                  <ExternalLink data-icon="inline-start" />
                  Open full page
                </Link>
              }
            />
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
