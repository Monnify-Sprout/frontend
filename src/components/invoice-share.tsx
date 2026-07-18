import { CopyButton } from '@/components/copy-button';
import type { Invoice } from '@/lib/schemas';

// The share block a merchant sends to their buyer: virtual account for a bank
// transfer, plus the Monnify checkout URL for card payment (PRD §7.2).
export function InvoiceShare({ invoice }: { invoice: Invoice }) {
  return (
    <div className="flex flex-col gap-3">
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
