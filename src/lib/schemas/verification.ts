import { z } from 'zod';

import { merchantSchema } from './merchant';

// Mirrors backend src/modules/verification/verification.schema.ts. The settlement
// account is required (DECIDED 2026-07-18) - it's where the merchant gets paid.
export const verificationInputSchema = z.object({
  id_type: z.enum(['BVN', 'NIN']),
  id_number: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'BVN/NIN must be exactly 11 digits'),
  settlement_bank_code: z
    .string()
    .trim()
    .regex(/^\d{3,6}$/, 'Select your bank'),
  settlement_bank_name: z.string().trim().min(1).max(120).optional(),
  settlement_account_number: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Account number must be 10 digits'),
  settlement_account_name: z.string().trim().max(200).optional(),
});

export type VerificationInput = z.infer<typeof verificationInputSchema>;

export const verificationResponseSchema = z.object({ merchant: merchantSchema });
