'use client';

import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatNaira } from '@/lib/format';
import type { AnalyticsResponse } from '@/lib/schemas';
import { cn } from '@/lib/utils';

// One row of any breakdown dimension. Every breakdown (trend, day of week, time
// of day, amount range, payment method, top customers, top items - and a future
// category dimension) is normalised to this shape, so they all render through
// the same components. This is what keeps the view "dimension-agnostic".
interface Row {
  label: string;
  count: number;
  amount: number;
  // Optional per-row bar colour (used by the category breakdown); when unset the
  // bar falls back to the single brand hue, keeping the renderer dimension-agnostic.
  color?: string | null;
}

const SHORT_DATE = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
});

function prettyMethod(method: string): string {
  if (method === 'UNKNOWN') return 'Other';
  return method
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

// Human-readable elapsed time for "average time to payment".
function formatDuration(hours: number | null): string {
  if (hours == null) return 'N/A';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="gap-1 py-5">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold">{value}</CardTitle>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardHeader>
    </Card>
  );
}

// Magnitude over time. Single-hue brand bars (one series, so no legend and no
// categorical palette); dense, so values live in a hover tooltip, not on every
// bar, and only the first/middle/last dates are labelled.
function TrendChart({ trend }: { trend: AnalyticsResponse['trend'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...trend.map((d) => d.amount));
  const labelIdx = new Set([0, Math.floor(trend.length / 2), trend.length - 1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales over time</CardTitle>
        <CardDescription>Amount collected per day</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative flex h-40 items-end justify-center gap-0.5">
          {trend.map((d, i) => (
            <div
              key={d.date}
              className="group relative flex h-full max-w-[44px] flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            >
              <div
                className="w-full rounded-t bg-brand/80 transition-colors group-hover:bg-brand"
                style={{
                  height: `${Math.max(2, (d.amount / max) * 100)}%`,
                }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-10 w-max -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs shadow-md">
                  <p className="font-medium">{SHORT_DATE.format(new Date(d.date))}</p>
                  <p className="text-muted-foreground">
                    {formatNaira(d.amount)} · {d.count}{' '}
                    {d.count === 1 ? 'sale' : 'sales'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          {trend.map((d, i) =>
            labelIdx.has(i) ? (
              <span key={d.date}>{SHORT_DATE.format(new Date(d.date))}</span>
            ) : null,
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// A generic ranked breakdown: horizontal single-hue bars with the amount and
// count direct-labelled (few enough rows that hover isn't needed).
function BreakdownCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Row[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-medium">
                  {r.color && (
                    <span
                      className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: r.color }}
                    />
                  )}
                  <span className="truncate">{r.label}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {formatNaira(r.amount)}
                  <span className="ml-1 text-xs">
                    ({r.count} {r.count === 1 ? 'sale' : 'sales'})
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', !r.color && 'bg-brand')}
                  style={{
                    width: `${Math.max(2, (r.amount / max) * 100)}%`,
                    ...(r.color ? { backgroundColor: r.color } : {}),
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// The four invoice outcomes as a stacked proportion bar + legend. Colours match
// the invoice status badges (brand=paid, amber=outstanding, muted=overdue,
// destructive=cancelled) so the funnel reads consistently with the list.
const FUNNEL_SEGMENTS = [
  { key: 'paid', label: 'Paid', bar: 'bg-brand', dot: 'bg-brand' },
  {
    key: 'outstanding',
    label: 'Outstanding',
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    bar: 'bg-muted-foreground/40',
    dot: 'bg-muted-foreground/40',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    bar: 'bg-destructive/60',
    dot: 'bg-destructive/60',
  },
] as const;

function FunnelCard({ funnel }: { funnel: NonNullable<AnalyticsResponse['funnel']> }) {
  const totalAmount = funnel.total_invoiced.amount;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invoice funnel</CardTitle>
        <CardDescription>
          What became of the {funnel.total_invoiced.count}{' '}
          {funnel.total_invoiced.count === 1 ? 'invoice' : 'invoices'} you raised
          in this period
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-semibold text-brand">
              {percent(funnel.collection_rate)}
            </p>
            <p className="text-xs text-muted-foreground">
              Collection rate ({percent(funnel.collection_rate_amount)} by value)
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {formatNaira(funnel.outstanding.amount)}
            </p>
            <p className="text-xs text-muted-foreground">Outstanding to collect</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {formatDuration(funnel.avg_hours_to_payment)}
            </p>
            <p className="text-xs text-muted-foreground">Avg time to payment</p>
          </div>
        </div>

        {totalAmount > 0 && (
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
            {FUNNEL_SEGMENTS.map((seg) => {
              const width = (funnel[seg.key].amount / totalAmount) * 100;
              if (width <= 0) return null;
              return (
                <div
                  key={seg.key}
                  className={seg.bar}
                  style={{ width: `${width}%` }}
                />
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {FUNNEL_SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn('size-2 rounded-full', seg.dot)} />
                {seg.label}
              </span>
              <span className="text-sm font-medium">
                {formatNaira(funnel[seg.key].amount)}
              </span>
              <span className="text-xs text-muted-foreground">
                {funnel[seg.key].count}{' '}
                {funnel[seg.key].count === 1 ? 'invoice' : 'invoices'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsResponse }) {
  const { totals, funnel } = data;
  const isMerchant = data.scope.type === 'merchant';

  if (totals.transaction_count === 0) {
    return (
      <div className="flex flex-col gap-4">
        {funnel && funnel.total_invoiced.count > 0 && <FunnelCard funnel={funnel} />}
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">No payments in this period</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Once payments come in, your totals and breakdowns appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dayRows: Row[] = data.day_of_week.map((d) => ({
    label: d.day,
    count: d.count,
    amount: d.amount,
  }));
  const timeRows: Row[] = data.time_of_day.map((t) => ({
    label: t.bucket,
    count: t.count,
    amount: t.amount,
  }));
  const rangeRows: Row[] = data.amount_ranges.map((r) => ({
    label: r.range,
    count: r.count,
    amount: r.amount,
  }));
  const methodRows: Row[] = data.payment_methods.map((m) => ({
    label: prettyMethod(m.method),
    count: m.count,
    amount: m.amount,
  }));
  const customerRows: Row[] = data.top_customers.map((c) => ({
    label: c.customer,
    count: c.count,
    amount: c.amount,
  }));
  const itemRows: Row[] | null =
    data.top_items?.map((it) => ({
      label: it.item,
      count: it.count,
      amount: it.amount,
    })) ?? null;
  const categoryRows: Row[] | null =
    data.by_category?.map((c) => ({
      label: c.category,
      count: c.count,
      amount: c.amount,
      color: c.color,
    })) ?? null;
  const linkRows: Row[] | null =
    data.by_link?.map((l) => ({
      label: l.link,
      count: l.count,
      amount: l.amount,
    })) ?? null;
  const streamRows: Row[] | null =
    data.by_stream?.map((s) => ({
      label: s.stream,
      count: s.count,
      amount: s.amount,
    })) ?? null;
  // With no streams defined, every sale is one "Unassigned" row - hide the card
  // until the dimension is actually in use.
  const streamsInUse =
    streamRows !== null &&
    streamRows.some((r) => r.label !== 'Unassigned');

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Total collected" value={formatNaira(totals.gross_amount)} />
        <StatTile
          label="Payments"
          value={String(totals.transaction_count)}
          sub={`over ${data.window_days} days`}
        />
        <StatTile label="Average sale" value={formatNaira(totals.average_amount)} />
        <StatTile label="Largest sale" value={formatNaira(totals.largest_amount)} />
        <StatTile
          label="Unique customers"
          value={String(totals.unique_customers)}
        />
        {isMerchant && (
          <>
            <StatTile
              label="Net settled"
              value={formatNaira(totals.net_amount)}
              sub="to your bank account"
            />
            <StatTile
              label="Sprout fees"
              value={formatNaira(totals.fees_amount)}
              sub="platform commission"
            />
          </>
        )}
      </div>

      {funnel && <FunnelCard funnel={funnel} />}

      <TrendChart trend={data.trend} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {categoryRows && (
          <BreakdownCard
            title="By category"
            description="Sales grouped your way"
            rows={categoryRows}
          />
        )}
        {linkRows && linkRows.length > 0 && (
          <BreakdownCard
            title="By payment link"
            description="Revenue per reusable link"
            rows={linkRows}
          />
        )}
        {streamsInUse && streamRows && (
          <BreakdownCard
            title="By stream"
            description="Where your sales come from"
            rows={streamRows}
          />
        )}
        <BreakdownCard
          title="Payment method"
          description="How buyers paid"
          rows={methodRows}
        />
        <BreakdownCard title="Busiest days" description="By day of week" rows={dayRows} />
        <BreakdownCard
          title="Time of day"
          description="When sales come in"
          rows={timeRows}
        />
        <BreakdownCard
          title="Top customers"
          description="By amount collected"
          rows={customerRows}
        />
        <BreakdownCard title="Sale sizes" description="By amount range" rows={rangeRows} />
        {itemRows && (
          <BreakdownCard
            title="Top items"
            description="Your best sellers"
            rows={itemRows}
          />
        )}
      </div>
    </div>
  );
}
