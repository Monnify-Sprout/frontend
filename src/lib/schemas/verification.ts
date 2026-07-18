import { z } from 'zod';

import { merchantSchema } from './merchant';

// Mirrors backend src/modules/verification/verification.schema.ts.
export const verificationInputSchema = z.object({
  id_type: z.enum(['BVN', 'NIN']),
  id_number: z
    .string()
    .trim()
    .regex(/^\d{11}$/, 'BVN/NIN must be exactly 11 digits'),
  settlement_bank_code: z
    .string()
    .trim()
    .regex(/^\d{3}$/, 'Bank code must be 3 digits')
    .optional(),
  settlement_account_number: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Account number must be 10 digits')
    .optional(),
});

export type VerificationInput = z.infer<typeof verificationInputSchema>;

export const verificationResponseSchema = z.object({ merchant: merchantSchema });
