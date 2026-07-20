'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock, Plus, ReceiptText, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  applyInvoiceFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  InvoiceFilterDialog,
  type InvoiceFilters,
} from '@/components/invoice-filters';
import { InvoiceSheet } from '@/components/invoice-sheet';
import { InvoiceTabs } from '@/components/invoice-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  customerLabel,
  formatDate,
  formatDateTime,
  formatNaira,
  INVOICE_STATUS_STYLES,
} from '@/lib/format';
import {
  listCategoriesResponseSchema,
  listInvoicesResponseSchema,
  meResponseSchema,
} from '@/lib/schemas';
import { cn, rowActivate } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

// Shown to merchants who are not Active yet: invoice creation stays out of
// reach until verification completes (Phase 6 acceptance).
function LockedState() {
  return (
    <Card>
      <CardHeader className="items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Lock className="size-6" />
        </span>
        <CardTitle className="text-xl">Invoicing is locked</CardTitle>
        <CardDescription>
          Only verified, active merchants can create invoices. Verify your BVN or NIN to
          unlock payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button
          nativeButton={false}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          render={<Link href="/verify">Verify your identity</Link>}
        />
      </CardContent>
    </Card>
  );
}

export default function InvoicesPage() {
  const { merchant: cached, setMerchant } = useAuthStore();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/me');
      const parsed = meResponseSchema.parse(res.data);
      setMerchant(parsed.merchant);
      return parsed.merchant;
    },
  });
  const merchant = me.data ?? cached;
  const active = merchant?.status === 'active';

  const invoices = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/api/invoices');
      return listInvoicesResponseSchema.parse(res.data).invoices;
    },
    enabled: active,
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return listCategoriesResponseSchema.parse(res.data).categories;
    },
    enabled: active,
  });


  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<InvoiceFilters>(EMPTY_FILTERS);
  const activeFilters = countActiveFilters(filters);

  // Clicking a row opens the invoice in a slide-over sheet instead of navigating
  // away; the id is kept for one render after close so the sheet can animate out.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openInvoice = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const filtered = useMemo(() => {
    const structured = applyInvoiceFilters(invoices.data ?? [], filters);
    const q = search.trim().toLowerCase();
    if (!q) return structured;
    return structured.filter((inv) => {
      const hay = [
        inv.customer_name,
        inv.customer_social_handle,
        inv.customer_phone,
        inv.customer_email,
        inv.item,
        inv.category_name,
        inv.invoice_reference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [invoices.data, search, filters]);

  if (!merchant) return null;

  const total = invoices.data?.length ?? 0;
  const narrowed = search.trim() !== '' || activeFilters > 0;

  return (
    <div className="flex flex-col gap-6">
      <InvoiceTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create an invoice and share the payment details with your customer.
          </p>
        </div>
        {active && (
          <Button
            nativeButton={false}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            render={
              <Link href="/invoices/new">
                <Plus data-icon="inline-start" />
                New invoice
              </Link>
            }
          />
        )}
      </div>

      {!active ? (
        <LockedState />
      ) : invoices.isPending ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading invoices…
          </CardContent>
        </Card>
      ) : invoices.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            Your invoices could not be loaded. Refresh to try again.
          </CardContent>
        </Card>
      ) : total === 0 ? (
        <Card>
          <CardHeader className="items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <ReceiptText className="size-6" />
            </span>
            <CardTitle className="text-xl">No invoices yet</CardTitle>
            <CardDescription>
              Your first invoice generates a virtual account and checkout link your
              customer can pay into.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-xs sm:flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, item, or reference"
                className="h-10 pl-9"
                aria-label="Search invoices"
              />
            </div>
            <div className="flex items-center gap-2">
              <InvoiceFilterDialog
                value={filters}
                onApply={setFilters}
                categories={categories.data ?? []}
              />
              {narrowed && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-10 text-muted-foreground"
                  onClick={() => {
                    setSearch('');
                    setFilters(EMPTY_FILTERS);
                  }}
                >
                  <X data-icon="inline-start" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {narrowed && (
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {total}{' '}
              {total === 1 ? 'invoice' : 'invoices'}
            </p>
          )}

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No invoices match your search and filters.
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">Due</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Created
                      </th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <tr
                        key={inv.id}
                        {...rowActivate(() => openInvoice(inv.id))}
                        aria-label={`Open invoice for ${customerLabel(inv)}`}
                        className="group cursor-pointer border-b last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground group-hover:text-brand">
                            {customerLabel(inv)}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>{inv.item ?? inv.invoice_reference}</span>
                            {inv.category_name && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 font-medium text-foreground">
                                <span
                                  className="size-2 rounded-full ring-1 ring-black/10"
                                  style={{
                                    backgroundColor: inv.category_color ?? undefined,
                                  }}
                                />
                                {inv.category_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatNaira(inv.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                              INVOICE_STATUS_STYLES[inv.status],
                            )}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {inv.due_date ? formatDate(inv.due_date) : 'None'}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {formatDateTime(inv.created_at)}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {inv.paid_at ? formatDateTime(inv.paid_at) : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      <InvoiceSheet
        invoiceId={selectedId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
