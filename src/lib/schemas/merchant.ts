import { z } from 'zod';

// Mirrors backend PublicMerchant (src/modules/auth/auth.repo.ts) exactly.
export const verificationStatusSchema = z.enum(['pending', 'verified', 'failed']);
export const merchantStatusSchema = z.enum(['onboarding', 'active', 'suspended']);
export const verificationModeSchema = z.enum(['live', 'mock']);

export const merchantSchema = z.object({
  id: z.string(),
  business_name: z.string(),
  owner_name: z.string(),
  phone: z.string(),
  email: z.string(),
  verification_status: verificationStatusSchema,
  verification_reason: z.string().nullable(),
  verification_mode: verificationModeSchema.nullable(),
  sub_account_code: z.string().nullable(),
  status: merchantStatusSchema,
  verified_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Merchant = z.infer<typeof merchantSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export type MerchantStatus = z.infer<typeof merchantStatusSchema>;
