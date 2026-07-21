'use client';

import { CopyButton } from '@/components/copy-button';
import type { Invoice } from '@/lib/schemas';

// The share block a merchant sends to their buyer: the Sprout-hosted buyer page
// (the link the buyer actually opens - it self-updates to Paid), the virtual
// account for a bank transfer, plus the Monnify checkout URL for card payment
// (PRD §7.2).
export function InvoiceShare({ invoice }: { invoice: Invoice }) {
  // The origin is only known on the client; on the server it renders as a
  // relative path. suppressHydrationWarning covers that one differing text node.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const buyerUrl = invoice.invoice_reference
    ? `${origin}/pay/${invoice.invoice_reference}`
    : null;

  return (
    <div className="flex flex-col gap-3">
      {buyerUrl && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Buyer payment page</p>
            <p className="truncate text-sm font-medium" suppressHydrationWarning>
              {buyerUrl}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={buyerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brand hover:underline"
            >
              Open
            </a>
            <CopyButton value={buyerUrl} label="buyer page link" />
          </div>
        </div>
      )}
      {invoice.virtual_account_number && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Virtual account (bank transfer)
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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              Checkout link (card payment)
            </p>
            <p className="truncate text-sm font-medium">{invoice.checkout_url}</p>
          </div>
          <CopyButton value={invoice.checkout_url} label="checkout link" />
        </div>
      )}
    </div>
  );
}
