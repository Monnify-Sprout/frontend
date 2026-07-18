'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { CalendarX2, CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { use } from 'react';

import { CopyButton } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { customerLabel, formatDate, formatDateTime, formatNaira } from '@/lib/format';
import { publicInvoiceResponseSchema } from '@/lib/schemas';

// Buyer-facing payment page (PRD §7.2 flow C). The invoice status shown here
// comes ONLY from polling the public lookup - never from redirect/query params
// a payment provider (or anyone else) appends to the URL. The backend settles
// expiry server-side and withholds payment channels on terminal invoices, so a
// paid or expired invoice can never re-offer payment.
export default function PayPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);

  const lookup = useQuery({
    queryKey: ['public-invoice', reference],
    queryFn: async () => {
      const res = await api.get(
        `/api/public/invoices/${encodeURIComponent(reference)}`,
      );
      return publicInvoiceResponseSchema.parse(res.data);
    },
    // A missing invoice will not appear on retry; everything else gets one.
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) &&
      failureCount < 1,
    // Poll while payable so a bank-transfer or checkout payment flips the page
    // to Paid without a manual refresh; stop once the state is terminal.
    refetchInterval: (query) =>
      query.state.data?.invoice.status === 'pending' ? 4000 : false,
    // Buyers switch to their banking app (or the Monnify checkout tab) to pay,
    // leaving this page backgrounded - keep polling anyway, and check again
    // the moment they come back.
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  if (lookup.isPending) {
    return (
      <Card className="w-full">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading invoice…
        </CardContent>
      </Card>
    );
  }

  if (lookup.isError || !lookup.data) {
    const notFound =
      axios.isAxiosError(lookup.error) && lookup.error.response?.status === 404;
    return (
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <XCircle className="size-10 text-muted-foreground" />
          <CardTitle className="text-xl">
            {notFound ? 'Invoice not found' : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {notFound
              ? 'This payment link is not valid. Check the link or ask the business that sent it.'
              : 'The invoice could not be loaded. Check your connection and try again.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { invoice, payment } = lookup.data;

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardDescription>Payment request from</CardDescription>
          <CardTitle className="text-lg">{invoice.business_name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-3xl font-semibold tracking-tight">
              {formatNaira(invoice.amount)}
            </p>
            {invoice.item && (
              <p className="mt-1 text-sm text-muted-foreground">
                {invoice.item}
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Billed to</dt>
              <dd>{customerLabel(invoice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due</dt>
              <dd>
                {invoice.due_date ? formatDate(invoice.due_date) : 'No due date'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {invoice.status === 'pending' && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">How to pay</CardTitle>
            <CardDescription>
              Transfer to the account below, or pay by card. This page updates
              automatically once your payment is confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {invoice.virtual_account_number && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Bank transfer (virtual account)
                  </p>
                  <p className="font-mono text-lg font-semibold tracking-wide">
                    {invoice.virtual_account_number}
                  </p>
                </div>
                <CopyButton
                  value={invoice.virtual_account_number}
                  label="virtual account number"
                />
              </div>
            )}
            {invoice.checkout_url && (
              <Button
                nativeButton={false}
                size="lg"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                render={
                  <a
                    href={invoice.checkout_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <CreditCard data-icon="inline-start" />
                    Pay with card
                  </a>
                }
              />
            )}
            <p className="animate-pulse text-center text-xs text-muted-foreground">
              Waiting for payment confirmation…
            </p>
          </CardContent>
        </Card>
      )}

      {invoice.status === 'paid' && (
        <Card className="w-full border-brand/30">
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="size-10 text-brand" />
            <CardTitle className="text-xl">Payment received</CardTitle>
            <CardDescription>
              {formatNaira(payment?.amount ?? invoice.amount)} paid
              {payment?.paid_at ? ` on ${formatDateTime(payment.paid_at)}` : ''}
              {payment?.payment_method
                ? ` via ${payment.payment_method.toLowerCase().replace(/_/g, ' ')}`
                : ''}
              . You can close this page.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {invoice.status === 'expired' && (
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            <CalendarX2 className="size-10 text-muted-foreground" />
            <CardTitle className="text-xl">This invoice has expired</CardTitle>
            <CardDescription>
              It was due
              {invoice.due_date ? ` on ${formatDate(invoice.due_date)}` : ' earlier'}
              {' '}and can no longer be paid. Ask {invoice.business_name} to send
              you a new invoice.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {invoice.status === 'cancelled' && (
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            <XCircle className="size-10 text-destructive" />
            <CardTitle className="text-xl">This invoice was cancelled</CardTitle>
            <CardDescription>
              It can no longer be paid. Ask {invoice.business_name} if you were
              expecting to pay this.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
