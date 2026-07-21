import { z } from 'zod';

// Mirrors backend src/modules/streams/* shapes (Phase 13). A stream is where
// (or through whom) a sale came from - a shop branch, a market stall, the
// Instagram page, a sales rep, a pop-up, a second brand. Tracking-only streams
// are just labels; a ROUTED stream carries its own settlement account and
// Monnify sub-account, so revenue assigned to it settles there.

export const streamStatusSchema = z.enum(['active', 'archived']);

export const streamSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  name: z.string(),
  settlement_bank_code: z.string().nullable(),
  settlement_bank_name: z.string().nullable(),
  settlement_account_number: z.string().nullable(),
  settlement_account_name: z.string().nullable(),
  sub_account_code: z.string().nullable(),
  status: streamStatusSchema,
  // Phase 14: the merchant's default "<business> - Main" workspace. Exactly one
  // per merchant; it cannot be archived or deleted, and is the fallback scope.
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  // Rollups from the list endpoint; the create/update responses omit them.
  invoice_count: z.number().optional(),
  link_count: z.number().optional(),
  total_collected: z.number().optional(),
  last_paid_at: z.string().nullable().optional(),
});

// Blank optional form fields default to "" - treat a blank as absent before its
// validator runs (same helper shape as the invoice form).
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    schema.optional(),
  );

// The create/edit form. `routed` is form-only (not sent): a routed stream
// requires the settlement account fields; a tracking-only stream omits them.
export const streamFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60),
    routed: z.boolean(),
    settlement_bank_code: optional(
      z.string().trim().regex(/^\d{3,6}$/, 'Select a valid bank'),
    ),
    settlement_account_number: optional(
      z.string().trim().regex(/^\d{10}$/, 'Account number must be 10 digits'),
    ),
    settlement_account_name: optional(z.string().trim().min(1).max(200)),
  })
  .superRefine((v, ctx) => {
    if (v.routed && !v.settlement_bank_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['settlement_bank_code'],
        message: 'Select the bank this stream settles to.',
      });
    }
    if (v.routed && !v.settlement_account_number) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['settlement_account_number'],
        message: 'Enter the account this stream settles to.',
      });
    }
  });

export const streamResponseSchema = z.object({
  stream: streamSchema,
});

export const listStreamsResponseSchema = z.object({
  streams: z.array(streamSchema),
});

export type Stream = z.infer<typeof streamSchema>;
export type StreamStatus = z.infer<typeof streamStatusSchema>;
export type StreamForm = z.infer<typeof streamFormSchema>;
