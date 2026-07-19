import { z } from 'zod';

// Mirrors backend src/modules/categories/* shapes (Phase 11). A category is a
// merchant-owned name + display colour, assignable to invoices.

// #rrggbb hex, matching the backend colour constraint.
const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour');

export const categorySchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  name: z.string(),
  color: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  // Present on the list endpoint (invoices referencing this category); the
  // create/update responses omit it, so it is optional as well as nullable.
  invoice_count: z.number().nullable().optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40),
  color: colorSchema,
});

export const categoryResponseSchema = z.object({
  category: categorySchema,
});

export const listCategoriesResponseSchema = z.object({
  categories: z.array(categorySchema),
});

export type Category = z.infer<typeof categorySchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
