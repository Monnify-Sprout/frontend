'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Clock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, apiErrorMessage } from '@/lib/api';
import {
  meResponseSchema,
  verificationInputSchema,
  verificationResponseSchema,
  type Merchant,
  type VerificationInput,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

// PRD §7.1 / flow A: capture BVN or NIN, run the backend verification, and show
// a status screen where pending, verified and failed are visibly distinct.

function VerifiedState({ merchant }: { merchant: Merchant }) {
  return (
    <Card className="border-brand/30">
      <CardHeader className="items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <BadgeCheck className="size-7" />
        </span>
        <CardTitle className="text-xl">You&apos;re verified</CardTitle>
        <CardDescription>
          {merchant.business_name} is active. Your Monnify sub-account
          {merchant.sub_account_code ? (
            <>
              {' '}
              (<span className="font-mono">{merchant.sub_account_code}</span>)
            </>
          ) : null}{' '}
          is ready to receive payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button
          nativeButton={false}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          render={<Link href="/invoices/new">Create your first invoice</Link>}
        />
      </CardContent>
    </Card>
  );
}

function VerificationForm({
  merchant,
  failed,
}: {
  merchant: Merchant;
  failed: boolean;
}) {
  const queryClient = useQueryClient();
  const { setMerchant } = useAuthStore();

  const form = useForm<VerificationInput>({
    resolver: zodResolver(verificationInputSchema),
    defaultValues: { id_type: 'BVN', id_number: '' },
  });
  const idType = useWatch({ control: form.control, name: 'id_type' });

  const verify = useMutation({
    mutationFn: async (input: VerificationInput) => {
      const res = await api.post('/api/verification', input);
      return verificationResponseSchema.parse(res.data).merchant;
    },
    onSuccess: (updated) => {
      setMerchant(updated);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const { errors } = form.formState;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              failed
                ? 'bg-destructive/10 text-destructive'
                : 'bg-amber-100 text-amber-600',
            )}
          >
            {failed ? (
              <ShieldAlert className="size-5" />
            ) : (
              <Clock className="size-5" />
            )}
          </span>
          <div>
            <CardTitle>
              {failed ? 'Verification failed' : 'Verification pending'}
            </CardTitle>
            <CardDescription>
              {failed
                ? (merchant.verification_reason ??
                  'Your identity could not be confirmed. Check the number and try again.')
                : 'Verify your BVN or NIN to activate payments for your business.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={form.handleSubmit((input) => verify.mutate(input))}
          noValidate
        >
          <Field>
            <Label>Identity type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['BVN', 'NIN'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue('id_type', t)}
                  aria-pressed={idType === t}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    idType === t
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-input text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field>
            <Label htmlFor="id_number">{idType} number</Label>
            <Input
              id="id_number"
              inputMode="numeric"
              maxLength={11}
              placeholder="11 digits"
              className="h-11"
              aria-invalid={!!errors.id_number}
              {...form.register('id_number')}
            />
            <FieldError>{errors.id_number?.message}</FieldError>
            <p className="text-xs text-muted-foreground">
              Your number is used once for verification and never stored in full.
            </p>
          </Field>

          {verify.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(verify.error)}
            </p>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={verify.isPending}
          >
            {verify.isPending
              ? 'Verifying…'
              : failed
                ? 'Try again'
                : 'Verify identity'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  const { merchant: cached, setMerchant } = useAuthStore();

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/me');
      const parsed = meResponseSchema.parse(res.data);
      setMerchant(parsed.merchant);
      return parsed.merchant;
    },
  });

  const merchant = me.data ?? cached;
  if (!merchant) return null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Identity verification
        </h1>
        <p className="text-sm text-muted-foreground">
          The Central Bank requires every virtual account to be linked to a BVN
          or NIN.
        </p>
      </div>

      {merchant.verification_status === 'verified' ? (
        <VerifiedState merchant={merchant} />
      ) : (
        <VerificationForm
          merchant={merchant}
          failed={merchant.verification_status === 'failed'}
        />
      )}
    </div>
  );
}
