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

// Date + time - used wherever the moment matters (created, paid), not just the
// day. Due dates stay date-only (they carry no time).
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// A buyer may be identified by any one of these; show the first that exists.
// Accepts anything with the customer_* fields (full invoice or public subset).
export function customerLabel(c: {
  customer_name?: string | null;
  customer_social_handle?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
}): string {
  return (
    c.customer_name ||
    c.customer_social_handle ||
    c.customer_phone ||
    c.customer_email ||
    'Customer'
  );
}

// Live grouping for the amount input: keep digits and a single decimal point,
// comma-group the integer part, and cap the fraction at two places. The form
// stores the raw (comma-free) value; this is display only.
export function groupAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const intDigits =
    firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);
  const fraction =
    firstDot === -1 ? '' : cleaned.slice(firstDot + 1).replace(/\./g, '');
  const grouped = intDigits ? Number(intDigits).toLocaleString('en-NG') : '';
  if (firstDot === -1) return grouped;
  return `${grouped || '0'}.${fraction.slice(0, 2)}`;
}

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-brand/10 text-brand',
  expired: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};
