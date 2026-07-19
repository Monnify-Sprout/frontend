'use client';

import { CopyButton } from '@/components/copy-button';
import type { PaymentLink } from '@/lib/schemas';

// The share block a merchant sends out for a static payment link: the shareable
// public URL, plus the reserved account (bank transfer) and checkout URL that
// keep accepting many payments. Mirrors InvoiceShare, but a link is reusable.
export function LinkShare({ link }: { link: PaymentLink }) {
  // The origin is only known on the client; on the server it renders as a
  // relative path. suppressHydrationWarning covers that one differing text node.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/link/${link.slug}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Shareable link</p>
          <p className="truncate text-sm font-medium" suppressHydrationWarning>
            {url}
          </p>
        </div>
        <CopyButton value={url} label="payment link" />
      </div>
      {link.reserved_account_number && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Reserved account (bank transfer)
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
            label="reserved account number"
          />
        </div>
      )}
      {link.checkout_url && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Checkout link (card payment)</p>
            <p className="truncate text-sm font-medium">{link.checkout_url}</p>
          </div>
          <CopyButton value={link.checkout_url} label="checkout link" />
        </div>
      )}
    </div>
  );
}
