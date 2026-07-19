'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Ban, CreditCard, PauseCircle, XCircle } from 'lucide-react';
import { use, useState } from 'react';

import { CopyButton } from '@/components/copy-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatNaira, groupAmountInput } from '@/lib/format';
import { publicPaymentLinkResponseSchema } from '@/lib/schemas';

// Buyer-facing page for a static payment link. Unlike an invoice, a link is
// reusable (many payments), so this does NOT poll for a status flip - it just
// shows how to pay while the link is active. The backend withholds payment
// channels on a paused or ended link, so those states can never offer a way to
// pay.
export default function PublicLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [amount, setAmount] = useState('');

  const lookup = useQuery({
    queryKey: ['public-link', slug],
    queryFn: async () => {
      const res = await api.get(`/api/public/links/${encodeURIComponent(slug)}`);
      return publicPaymentLinkResponseSchema.parse(res.data);
    },
    retry: (failureCount, error) =>
      !(axios.isAxiosError(error) && error.response?.status === 404) &&
      failureCount < 1,
  });

  if (lookup.isPending) {
    return (
      <Card className="w-full">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading…
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
            {notFound ? 'Link not found' : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {notFound
              ? 'This payment link is not valid. Check the link or ask the business that sent it.'
              : 'The link could not be loaded. Check your connection and try again.'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { link } = lookup.data;
  const buyerEntered = link.amount == null;

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardDescription>Payment to</CardDescription>
          <CardTitle className="text-lg">{link.business_name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium">{link.title}</p>
            {link.item && (
              <p className="mt-0.5 text-sm text-muted-foreground">{link.item}</p>
            )}
          </div>
          {!buyerEntered && (
            <p className="text-3xl font-semibold tracking-tight">
              {formatNaira(link.amount!)}
            </p>
          )}
        </CardContent>
      </Card>

      {link.status === 'active' && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">How to pay</CardTitle>
            <CardDescription>
              Transfer to the account below, or pay by card.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {buyerEntered && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Amount you want to pay
                </p>
                <Input
                  inputMode="decimal"
                  placeholder="Enter amount"
                  className="h-11"
                  aria-label="Amount to pay"
                  value={groupAmountInput(amount)}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                />
              </div>
            )}
            {link.reserved_account_number && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Bank transfer (reserved account)
                  </p>
                  <p className="font-mono text-lg font-semibold tracking-wide">
                    {link.reserved_account_number}
                  </p>
                  {link.reserved_account_bank_name && (
                    <p className="text-xs text-muted-foreground">
                      {link.reserved_account_bank_name}
                    </p>
                  )}
                </div>
                <CopyButton
                  value={link.reserved_account_number}
                  label="account number"
                />
              </div>
            )}
            {link.checkout_url && (
              <Button
                nativeButton={false}
                size="lg"
                className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
                render={
                  <a href={link.checkout_url} target="_blank" rel="noopener noreferrer">
                    <CreditCard data-icon="inline-start" />
                    Pay with card
                  </a>
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {link.status === 'paused' && (
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            <PauseCircle className="size-10 text-muted-foreground" />
            <CardTitle className="text-xl">Temporarily unavailable</CardTitle>
            <CardDescription>
              {link.business_name} has paused this link. Check back later, or ask them
              for another way to pay.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {link.status === 'ended' && (
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            <Ban className="size-10 text-muted-foreground" />
            <CardTitle className="text-xl">This link is closed</CardTitle>
            <CardDescription>
              {link.business_name} is no longer collecting through this link. Ask them
              for a current one.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
