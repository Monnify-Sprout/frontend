import { z } from 'zod';

// Mirrors backend src/modules/payment-links/* shapes (Phase 12). A static payment
// link is reusable and long-lived: one link takes many "collections", unlike a
// one-time invoice.

export const paymentLinkStatusSchema = z.enum(['active', 'paused', 'ended']);

export const paymentLinkSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  title: z.string(),
  item: z.string().nullable(),
  slug: z.string(),
  amount: z.string().nullable(), // pg numeric as string; null = buyer-entered
  currency: z.string(),
  status: paymentLinkStatusSchema,
  category_id: z.string().nullable(),
  reserved_account_reference: z.string().nullable(),
  reserved_account_number: z.string().nullable(),
  reserved_account_bank_name: z.string().nullable(),
  checkout_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined category (list/detail); optional as well as nullable.
  category_name: z.string().nullable().optional(),
  category_color: z.string().nullable().optional(),
  // Collection rollups from the list query; undefined on the create response.
  collection_count: z.number().optional(),
  total_collected: z.string().optional(),
  last_paid_at: z.string().nullable().optional(),
});

export const linkPaymentSchema = z.object({
  id: z.string(),
  payment_link_id: z.string(),
  amount: z.string(),
  currency: z.string(),
  payment_method: z.string().nullable(),
  customer_name: z.string().nullable(),
  settlement_amount: z.string().nullable(),
  commission_amount: z.string().nullable(),
  monnify_transaction_reference: z.string().nullable(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
});

export const linkStatusSummarySchema = z.object({
  total: z.number(),
  active: z.number(),
  paused: z.number(),
  ended: z.number(),
  total_collected: z.number(),
});

export const linkStatsSchema = z.object({
  collection_count: z.number(),
  total_collected: z.number(),
  average_amount: z.number(),
  last_paid_at: z.string().nullable(),
});

export const listPaymentLinksResponseSchema = z.object({
  links: z.array(paymentLinkSchema),
  summary: linkStatusSummarySchema,
});

export const createPaymentLinkResponseSchema = z.object({
  link: paymentLinkSchema,
});

export const paymentLinkDetailResponseSchema = z.object({
  link: paymentLinkSchema,
  stats: linkStatsSchema,
  collections: z.array(linkPaymentSchema),
});

export const updateStatusResponseSchema = z.object({
  link: paymentLinkSchema,
});

// The demo "simulate a collection" result (extra keys are ignored).
export const simulateCollectionResponseSchema = z.object({
  outcome: z.string(),
  amount: z.number(),
});

// Buyer-facing safe subset (public.routes.ts). Payment channels are null unless
// the link is active.
export const publicPaymentLinkSchema = z.object({
  slug: z.string(),
  business_name: z.string(),
  title: z.string(),
  item: z.string().nullable(),
  amount: z.string().nullable(),
  currency: z.string(),
  status: paymentLinkStatusSchema,
  reserved_account_number: z.string().nullable(),
  reserved_account_bank_name: z.string().nullable(),
  checkout_url: z.string().nullable(),
});

export const publicPaymentLinkResponseSchema = z.object({
  link: publicPaymentLinkSchema,
});

// Blank optional form fields default to "" - treat a blank as absent before its
// validator runs (same helper shape as the invoice form).
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    schema.optional(),
  );

// The create form. `mode` is form-only (not sent): a fixed link requires an
// amount; a buyer-entered link omits it. The service payload is {title, item?,
// amount?, category_id?}.
export const createPaymentLinkFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    item: optional(z.string().trim().max(200)),
    mode: z.enum(['fixed', 'open']),
    amount: optional(
      z.coerce.number().positive('Amount must be greater than 0').max(1_000_000_000),
    ),
    category_id: optional(z.string().uuid('Invalid category')),
  })
  .superRefine((v, ctx) => {
    if (v.mode === 'fixed' && v.amount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: 'Enter a fixed amount, or let the buyer decide.',
      });
    }
  });

export type PaymentLink = z.infer<typeof paymentLinkSchema>;
export type PaymentLinkStatus = z.infer<typeof paymentLinkStatusSchema>;
export type LinkPayment = z.infer<typeof linkPaymentSchema>;
export type LinkStatusSummary = z.infer<typeof linkStatusSummarySchema>;
export type PublicPaymentLink = z.infer<typeof publicPaymentLinkSchema>;
export type CreatePaymentLinkForm = z.infer<typeof createPaymentLinkFormSchema>;
