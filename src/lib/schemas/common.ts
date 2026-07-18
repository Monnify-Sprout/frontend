import { z } from 'zod';

// Shared primitives for the schema layer. Every backend request/response shape
// is mirrored here (build plan Phase 5) and used for BOTH react-hook-form
// validation and React Query response parsing - one source of truth, no `any`.

// Version-agnostic email check - matches the backend's refine exactly.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
    message: 'Enter a valid email address',
  });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{7,15}$/, 'Enter a valid phone number');

// Backend error envelope: HttpError -> { error, details? } where details is the
// formatZodError output ({ field, message }[]).
export const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.array(fieldErrorSchema).optional(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
