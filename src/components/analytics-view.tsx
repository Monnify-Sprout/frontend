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

// One row of any breakdown dimension. Every breakdown (trend, day of week,
// amount range, payment method - and a future category dimension) is normalised
// to this shape, so they all render through the same components. This is what
// keeps the view "dimension-agnostic".
interface Row {
  label: string;
  count: number;
  amount: number;
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
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">
                  {formatNaira(r.amount)}
                  <span className="ml-1 text-xs">
                    ({r.count} {r.count === 1 ? 'sale' : 'sales'})
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(2, (r.amount / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsResponse }) {
  const { totals } = data;

  if (totals.transaction_count === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium">No sales in this period</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once payments come in, your totals and breakdowns appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dayRows: Row[] = data.day_of_week.map((d) => ({
    label: d.day,
    count: d.count,
    amount: d.amount,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Total collected"
          value={formatNaira(totals.gross_amount)}
        />
        <StatTile
          label="Payments"
          value={String(totals.transaction_count)}
          sub={`over ${data.window_days} days`}
        />
        <StatTile
          label="Average sale"
          value={formatNaira(totals.average_amount)}
        />
      </div>

      <TrendChart trend={data.trend} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="Payment method"
          description="How buyers paid"
          rows={methodRows}
        />
        <BreakdownCard
          title="Busiest days"
          description="By day of week"
          rows={dayRows}
        />
        <BreakdownCard
          title="Sale sizes"
          description="By amount range"
          rows={rangeRows}
        />
      </div>
    </div>
  );
}
