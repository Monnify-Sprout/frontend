'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

// Segmented control shared by the one-time invoices view (/invoices) and the
// static payment links view (/invoices/links), so the two read as tabs of the
// same page. Payment-link routes all live under /invoices/links; everything else
// under /invoices is the invoices tab.
const TABS = [
  { label: 'Invoices', href: '/invoices' },
  { label: 'Payment links', href: '/invoices/links' },
] as const;

export function InvoiceTabs() {
  const pathname = usePathname();
  const onLinks = pathname.startsWith('/invoices/links');

  return (
    // <div className="inline-flex rounded-lg border bg-muted/40 p-1">
    <div className="flex border-b border-border">
      {TABS.map((t) => {
        const active = t.href === '/invoices/links' ? onLinks : !onLinks;

        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
    // </div>
  );
}
