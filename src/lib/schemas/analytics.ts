import { z } from 'zod';

// Mirrors backend src/modules/analytics/analytics.service.ts - the shape is
// identical for both scopes (merchant and connected account) by design.

const bucketSchema = z.object({
  count: z.number(),
  amount: z.number(),
});

export const analyticsResponseSchema = z.object({
  scope: z.object({
    type: z.enum(['merchant', 'connected_account']),
    id: z.string(),
  }),
  window_days: z.number(),
  totals: z.object({
    transaction_count: z.number(),
    gross_amount: z.number(),
    average_amount: z.number(),
    largest_amount: z.number(),
    net_amount: z.number(),
    fees_amount: z.number(),
    unique_customers: z.number(),
  }),
  trend: z.array(bucketSchema.extend({ date: z.string() })),
  day_of_week: z.array(bucketSchema.extend({ day: z.string() })),
  time_of_day: z.array(bucketSchema.extend({ bucket: z.string() })),
  amount_ranges: z.array(bucketSchema.extend({ range: z.string() })),
  payment_methods: z.array(bucketSchema.extend({ method: z.string() })),
  top_customers: z.array(bucketSchema.extend({ customer: z.string() })),
  // Merchant-only (per-item detail); null for a connected account.
  top_items: z.array(bucketSchema.extend({ item: z.string() })).nullable(),
  // Merchant-only sales-by-category (Phase 11); null for a connected account.
  // Each row carries the category's colour (null for the "Uncategorised" row).
  by_category: z
    .array(bucketSchema.extend({ category: z.string(), color: z.string().nullable() }))
    .nullable(),
  // Merchant-only sales-by-payment-link (Phase 12); null for a connected account.
  by_link: z.array(bucketSchema.extend({ link: z.string() })).nullable(),
  // Merchant-only sales-by-stream (Phase 13); null for a connected account.
  // Covers invoices AND link collections; unassigned sales bucket as "Unassigned".
  by_stream: z.array(bucketSchema.extend({ stream: z.string() })).nullable(),
  // Merchant-only invoice funnel; null for a connected account.
  funnel: z
    .object({
      total_invoiced: bucketSchema,
      paid: bucketSchema,
      outstanding: bucketSchema,
      overdue: bucketSchema,
      cancelled: bucketSchema,
      collection_rate: z.number(),
      collection_rate_amount: z.number(),
      avg_hours_to_payment: z.number().nullable(),
    })
    .nullable(),
});

export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;
