'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Category, Invoice, InvoiceStatus } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// Structured invoice filters. Applied client-side over the already-fetched list
// (the dashboard holds every invoice for a merchant, so no extra round-trip);
// the general search box on the page is kept separate and composes with these.
export interface InvoiceFilters {
  statuses: InvoiceStatus[];
  categories: string[]; // category ids; empty = any
  createdFrom: string; // '' = unset, otherwise YYYY-MM-DD
  createdTo: string;
  dueFrom: string;
  dueTo: string;
  paidFrom: string;
  paidTo: string;
  amountMin: string;
  amountMax: string;
  customer: string;
}

export const EMPTY_FILTERS: InvoiceFilters = {
  statuses: [],
  categories: [],
  createdFrom: '',
  createdTo: '',
  dueFrom: '',
  dueTo: '',
  paidFrom: '',
  paidTo: '',
  amountMin: '',
  amountMax: '',
  customer: '',
};

const STATUSES: InvoiceStatus[] = ['pending', 'paid', 'expired', 'cancelled'];

// How many distinct filter groups are active - drives the badge on the button.
export function countActiveFilters(f: InvoiceFilters): number {
  let n = 0;
  if (f.statuses.length > 0) n += 1;
  if (f.categories.length > 0) n += 1;
  if (f.createdFrom || f.createdTo) n += 1;
  if (f.dueFrom || f.dueTo) n += 1;
  if (f.paidFrom || f.paidTo) n += 1;
  if (f.amountMin || f.amountMax) n += 1;
  if (f.customer.trim()) n += 1;
  return n;
}

const dayOf = (iso: string | null | undefined): string | null =>
  iso ? iso.slice(0, 10) : null;

// Pure predicate application - kept out of the component so it is trivial to
// reason about (and reuse). A date-range bound on a field that is null (e.g. an
// invoice with no due date, or one never paid) excludes that invoice.
export function applyInvoiceFilters(
  invoices: Invoice[],
  f: InvoiceFilters,
): Invoice[] {
  const customer = f.customer.trim().toLowerCase();
  const min = f.amountMin ? Number(f.amountMin) : null;
  const max = f.amountMax ? Number(f.amountMax) : null;

  return invoices.filter((inv) => {
    if (f.statuses.length > 0 && !f.statuses.includes(inv.status)) return false;

    // A category filter matches only invoices tagged with one of the selected
    // categories (uncategorised invoices are excluded when any is selected).
    if (f.categories.length > 0 && !(inv.category_id && f.categories.includes(inv.category_id)))
      return false;

    const created = dayOf(inv.created_at);
    if (f.createdFrom && (!created || created < f.createdFrom)) return false;
    if (f.createdTo && (!created || created > f.createdTo)) return false;

    const due = inv.due_date; // already YYYY-MM-DD (date-only) or null
    if (f.dueFrom && (!due || due < f.dueFrom)) return false;
    if (f.dueTo && (!due || due > f.dueTo)) return false;

    const paid = dayOf(inv.paid_at);
    if (f.paidFrom && (!paid || paid < f.paidFrom)) return false;
    if (f.paidTo && (!paid || paid > f.paidTo)) return false;

    const amount = Number(inv.amount);
    if (min !== null && Number.isFinite(min) && amount < min) return false;
    if (max !== null && Number.isFinite(max) && amount > max) return false;

    if (customer) {
      const hay = [
        inv.customer_name,
        inv.customer_social_handle,
        inv.customer_phone,
        inv.customer_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(customer)) return false;
    }

    return true;
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

// A labelled from/to row. The label sits to the left on desktop (so the three
// date rows line up into a tidy column) and stacks above on mobile.
function Range({
  label,
  from,
  to,
  onFrom,
  onTo,
  type = 'date',
  placeholderFrom,
  placeholderTo,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  type?: 'date' | 'number';
  placeholderFrom?: string;
  placeholderTo?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
      <span className="text-sm font-medium sm:w-20 sm:shrink-0">{label}</span>
      <div className="flex flex-1 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-2.5">
        <Input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          placeholder={placeholderFrom}
          aria-label={`${label} from`}
          className="h-10 w-full min-w-0 flex-1"
        />
        <span className="hidden text-xs text-muted-foreground min-[420px]:inline">
          to
        </span>
        <Input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={to}
          onChange={(e) => onTo(e.target.value)}
          placeholder={placeholderTo}
          aria-label={`${label} to`}
          className="h-10 w-full min-w-0 flex-1"
        />
      </div>
    </div>
  );
}

export function InvoiceFilterDialog({
  value,
  onApply,
  categories = [],
}: {
  value: InvoiceFilters;
  onApply: (f: InvoiceFilters) => void;
  categories?: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InvoiceFilters>(value);
  const activeCount = countActiveFilters(value);

  // Re-sync the draft to whatever is currently applied each time we open, so a
  // cancelled edit never leaks into the next session.
  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value);
    setOpen(next);
  };

  const set = <K extends keyof InvoiceFilters>(key: K, v: InvoiceFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const toggleStatus = (s: InvoiceStatus) =>
    setDraft((d) => ({
      ...d,
      statuses: d.statuses.includes(s)
        ? d.statuses.filter((x) => x !== s)
        : [...d.statuses, s],
    }));

  const toggleCategory = (id: string) =>
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(id)
        ? d.categories.filter((x) => x !== id)
        : [...d.categories, id],
    }));

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'relative h-10')}
      >
        <SlidersHorizontal data-icon="inline-start" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-brand text-xs font-medium text-brand-foreground">
            {activeCount}
          </span>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-xl gap-0 p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Filter invoices</DialogTitle>
          <DialogDescription>
            Narrow the list by status, dates, amount, or customer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-7 px-6 py-6">
          <section className="flex flex-col gap-3">
            <SectionLabel>Status</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const on = draft.statuses.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStatus(s)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                      on
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-input text-muted-foreground hover:border-brand/40 hover:bg-muted',
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </section>

          {categories.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel>Category</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const on = draft.categories.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      aria-pressed={on}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                        on
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-input text-muted-foreground hover:border-brand/40 hover:bg-muted',
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <SectionLabel>Dates</SectionLabel>
            <Range
              label="Created"
              from={draft.createdFrom}
              to={draft.createdTo}
              onFrom={(v) => set('createdFrom', v)}
              onTo={(v) => set('createdTo', v)}
            />
            <Range
              label="Due"
              from={draft.dueFrom}
              to={draft.dueTo}
              onFrom={(v) => set('dueFrom', v)}
              onTo={(v) => set('dueTo', v)}
            />
            <Range
              label="Paid"
              from={draft.paidFrom}
              to={draft.paidTo}
              onFrom={(v) => set('paidFrom', v)}
              onTo={(v) => set('paidTo', v)}
            />
          </section>

          <section className="flex flex-col gap-3">
            <SectionLabel>Amount &amp; customer</SectionLabel>
            <Range
              label="Amount ₦"
              type="number"
              from={draft.amountMin}
              to={draft.amountMax}
              onFrom={(v) => set('amountMin', v)}
              onTo={(v) => set('amountMax', v)}
              placeholderFrom="Min"
              placeholderTo="Max"
            />
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm font-medium sm:w-20 sm:shrink-0">Customer</span>
              <Input
                id="filter-customer"
                value={draft.customer}
                onChange={(e) => set('customer', e.target.value)}
                placeholder="Name, handle, phone, or email"
                className="h-10 flex-1"
              />
            </div>
          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setDraft(EMPTY_FILTERS)}
          >
            Reset
          </Button>
          <div className="flex gap-2">
            <DialogClose
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              size="lg"
              className="bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={apply}
            >
              Apply filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
