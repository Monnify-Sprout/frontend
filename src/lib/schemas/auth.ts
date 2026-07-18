import { z } from 'zod';

import { emailSchema, phoneSchema } from './common';
import { merchantSchema } from './merchant';

// ── Requests (mirror backend src/modules/auth/auth.schema.ts) ───────────────

export const registerInputSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(200),
  owner_name: z.string().trim().min(1, 'Owner name is required').max(200),
  phone: phoneSchema,
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// ── Responses ───────────────────────────────────────────────────────────────

export const registerResponseSchema = z.object({ merchant: merchantSchema });
export const loginResponseSchema = z.object({
  token: z.string(),
  merchant: merchantSchema,
});
export const meResponseSchema = z.object({ merchant: merchantSchema });

export type LoginResponse = z.infer<typeof loginResponseSchema>;
