import type { InvoiceStatus } from '@/lib/schemas';

const ngn = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
});

// pg numeric arrives as a string; settlement figures arrive as numbers.
export function formatNaira(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return Number.isFinite(n) ? ngn.format(n) : String(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-brand/10 text-brand',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};
