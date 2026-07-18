import { z } from 'zod';

import { emailSchema } from './common';

// Mirrors backend src/modules/invoices/* shapes.

export const invoiceStatusSchema = z.enum([
  'pending',
  'paid',
  'expired',
  'cancelled',
]);
export const settlementPathSchema = z.enum(['split', 'manual']);

export const invoiceSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  invoice_reference: z.string().nullable(),
  customer_name: z.string(),
  customer_email: z.string().nullable(),
  description: z.string().nullable(),
  amount: z.string(), // pg numeric arrives as a string
  currency: z.string(),
  due_date: z.string().nullable(),
  status: invoiceStatusSchema,
  virtual_account_number: z.string().nullable(),
  checkout_url: z.string().nullable(),
  monnify_transaction_reference: z.string().nullable(),
  settlement_path: settlementPathSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
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

export const createInvoiceInputSchema = z.object({
  customer_name: z.string().trim().min(1, 'Customer name is required').max(200),
  customer_email: emailSchema.optional(),
  description: z.string().trim().max(500).optional(),
  amount: z.coerce
    .number()
    .positive('Amount must be greater than 0')
    .max(1_000_000_000),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD')
    .optional(),
});

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
// subset. Payment channels are null whenever the invoice is not payable, and
// payment (when paid) carries no settlement/commission figures.
export const publicInvoiceSchema = z.object({
  invoice_reference: z.string(),
  business_name: z.string(),
  customer_name: z.string(),
  description: z.string().nullable(),
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
