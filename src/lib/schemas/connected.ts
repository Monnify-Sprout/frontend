import { z } from 'zod';

// Mirrors backend src/modules/connected/* shapes. Note: the API never returns
// credential material after creation, so no credential fields exist here.

export const connectedStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
]);

export const connectedAccountSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  business_name: z.string(),
  contract_code: z.string(),
  last_synced_at: z.string().nullable(),
  status: connectedStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export const connectAccountInputSchema = z.object({
  business_name: z.string().trim().min(1, 'Business name is required').max(200),
  api_key: z.string().trim().min(8, 'API key looks too short').max(128),
  secret_key: z.string().trim().min(8, 'Secret key looks too short').max(128),
  contract_code: z
    .string()
    .trim()
    .min(4, 'Contract code looks too short')
    .max(64),
});

export const connectAccountResponseSchema = z.object({
  account: connectedAccountSchema,
});

export const listConnectedAccountsResponseSchema = z.object({
  accounts: z.array(connectedAccountSchema),
});

export const syncResponseSchema = z.object({
  account: connectedAccountSchema,
  fetched: z.number(),
  inserted: z.number(),
});

export type ConnectedAccount = z.infer<typeof connectedAccountSchema>;
export type ConnectAccountInput = z.infer<typeof connectAccountInputSchema>;
