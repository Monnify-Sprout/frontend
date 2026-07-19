import { z } from 'zod';

import { emailSchema, phoneSchema } from './common';

// Mirrors backend src/modules/invoices/* shapes.

export const invoiceStatusSchema = z.enum(['pending', 'paid', 'expired', 'cancelled']);
export const settlementPathSchema = z.enum(['split', 'manual']);

export const invoiceSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  invoice_reference: z.string().nullable(),
  customer_name: z.string().nullable(),
  customer_email: z.string().nullable(),
  customer_phone: z.string().nullable(),
  customer_social_handle: z.string().nullable(),
  customer_social_platform: z.string().nullable(),
  item: z.string().nullable(),
  notes: z.string().nullable(),
  amount: z.string(), // pg numeric arrives as a string
  currency: z.string(),
  due_date: z.string().nullable(),
  status: invoiceStatusSchema,
  category_id: z.string().nullable(),
  virtual_account_number: z.string().nullable(),
  checkout_url: z.string().nullable(),
  monnify_transaction_reference: z.string().nullable(),
  settlement_path: settlementPathSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // Only the merchant list endpoint joins the payment to expose this; the
  // create/detail responses omit it (detail carries a full payment object), so
  // it is optional as well as nullable.
  paid_at: z.string().nullable().optional(),
  // Only the merchant list/detail endpoints join the category to expose these;
  // create/public responses omit them, so they are optional as well as nullable.
  category_name: z.string().nullable().optional(),
  category_color: z.string().nullable().optional(),
});

export const paymentSchema = z.object({
  id: z.string(),
  invoice_id: z.string(),
  amount: z.string(),
  currency: z.string(),
  payment_method: z.string().nullable(),
  settlement_amount: z.string().nullable(),
  commission_amount: z.string().nullable(),
  monnify_transaction_reference: z.string().nullable(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
});

// A handle like "@chidi_styles"; the leading @ is optional. Mirrors the backend.
const socialHandleSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^@?[a-zA-Z0-9._]+$/, 'Enter a valid handle, e.g. @chidi_styles');

// The network the handle is on. Known keys plus free-typed "Other". Mirrors the
// backend's socialPlatformField.
const socialPlatformSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .regex(/^[a-zA-Z0-9 .&/_-]+$/, 'Enter a valid platform');

// The form's untouched optional fields default to "" (not undefined), so treat a
// blank field as absent before its validator runs - otherwise every empty
// optional field would fail its own format check on submit.
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    schema.optional(),
  );

// The sale is a required `item` plus optional `notes`; the buyer needs at least
// one identifier (name / phone / email / social handle) - name is not mandatory
// because social-commerce buyers are often known only by a handle.
export const createInvoiceInputSchema = z
  .object({
    customer_name: optional(z.string().trim().min(1, 'Enter a name').max(200)),
    customer_phone: optional(phoneSchema),
    customer_email: optional(emailSchema),
    customer_social_handle: optional(socialHandleSchema),
    customer_social_platform: optional(socialPlatformSchema),
    item: z.string().trim().min(1, 'Item is required').max(200),
    notes: optional(z.string().trim().max(500)),
    amount: z.coerce
      .number()
      .positive('Amount must be greater than 0')
      .max(1_000_000_000),
    due_date: optional(
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    ),
    // Optional merchant category (Phase 11); the picker sends the category id.
    category_id: optional(z.string().uuid('Invalid category')),
  })
  .refine(
    (v) =>
      Boolean(
        v.customer_name ||
        v.customer_phone ||
        v.customer_email ||
        v.customer_social_handle,
      ),
    {
      message:
        'Add at least one way to identify the buyer: name, phone, email, or social handle.',
      path: ['customer_name'],
    },
  );

export const createInvoiceResponseSchema = z.object({
  invoice: invoiceSchema,
  settlement: z.object({
    path: settlementPathSchema,
    commission_percent: z.number(),
    commission_amount: z.number(),
    settlement_amount: z.number(),
  }),
});

export const listInvoicesResponseSchema = z.object({
  invoices: z.array(invoiceSchema),
});

export const invoiceDetailResponseSchema = z.object({
  invoice: invoiceSchema,
  payment: paymentSchema.nullable(),
});

// Mirrors backend src/modules/invoices/public.routes.ts: the safe buyer-facing
// subset. `notes`, customer phone/email, and settlement figures are withheld.
// Payment channels are null unless the invoice is still payable.
export const publicInvoiceSchema = z.object({
  invoice_reference: z.string(),
  business_name: z.string(),
  customer_name: z.string().nullable(),
  customer_social_handle: z.string().nullable(),
  customer_social_platform: z.string().nullable(),
  item: z.string().nullable(),
  amount: z.string(),
  currency: z.string(),
  due_date: z.string().nullable(),
  status: invoiceStatusSchema,
  virtual_account_number: z.string().nullable(),
  checkout_url: z.string().nullable(),
  created_at: z.string(),
});

export const publicInvoiceResponseSchema = z.object({
  invoice: publicInvoiceSchema,
  payment: z
    .object({
      amount: z.string(),
      payment_method: z.string().nullable(),
      paid_at: z.string().nullable(),
    })
    .nullable(),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type PublicInvoice = z.infer<typeof publicInvoiceSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;
