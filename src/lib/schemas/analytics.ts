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
  }),
  trend: z.array(bucketSchema.extend({ date: z.string() })),
  day_of_week: z.array(bucketSchema.extend({ day: z.string() })),
  amount_ranges: z.array(bucketSchema.extend({ range: z.string() })),
  payment_methods: z.array(bucketSchema.extend({ method: z.string() })),
});

export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;
