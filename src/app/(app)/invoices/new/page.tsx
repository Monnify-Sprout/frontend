'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { InvoiceShare } from '@/components/invoice-share';
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
import { Textarea } from '@/components/ui/textarea';
import { api, apiErrorMessage } from '@/lib/api';
import { customerLabel, formatNaira, groupAmountInput } from '@/lib/format';
import { cn } from '@/lib/utils';
import { createInvoiceInputSchema, createInvoiceResponseSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

// react-hook-form works with the schema's INPUT type (amount arrives as a
// string from the field and is coerced by zod).
type FormValues = z.input<typeof createInvoiceInputSchema>;
type CreateResult = z.infer<typeof createInvoiceResponseSchema>;

// Where a social-commerce buyer's handle lives. Known networks are stored under
// their lowercase key; "other" reveals a field so the merchant can name any
// network we don't list.
const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'other', label: 'Other' },
] as const;

function Confirmation({ result }: { result: CreateResult }) {
  const { invoice, settlement } = result;
  return (
    <Card className="border-brand/30">
      <CardHeader className="items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <CircleCheck className="size-7" />
        </span>
        <CardTitle className="text-xl">Invoice created</CardTitle>
        <CardDescription>
          Share these payment details with {customerLabel(invoice)}. The invoice is marked
          paid automatically once Monnify confirms the payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Amount due</p>
          <p className="text-2xl font-semibold">{formatNaira(invoice.amount)}</p>
          <p className="text-xs text-muted-foreground">
            {invoice.item ? `${invoice.item} · ` : ''}Ref {invoice.invoice_reference}
          </p>
        </div>

        <InvoiceShare invoice={invoice} />

        <p className="text-xs text-muted-foreground">
          {`You receive ${formatNaira(settlement.settlement_amount)} after Sprout's ${settlement.commission_percent}% commission of ${formatNaira(settlement.commission_amount)}. Monnify's own transaction fee is separate.`}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/invoices/${invoice.id}`}>View invoice</Link>}
          />
          <Button
            nativeButton={false}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            render={<Link href="/invoices">Back to invoices</Link>}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { merchant, hydrated } = useAuthStore();
  const [result, setResult] = useState<CreateResult | null>(null);

  // Non-active merchants cannot reach invoice creation (Phase 6 acceptance);
  // the backend enforces this too (403).
  useEffect(() => {
    if (hydrated && merchant && merchant.status !== 'active') {
      router.replace('/invoices');
    }
  }, [hydrated, merchant, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createInvoiceInputSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      customer_social_handle: '',
      customer_social_platform: '',
      item: '',
      notes: '',
      amount: '',
      due_date: '',
    },
  });

  // Platform picker for the social handle. `platformChoice` is the selected pill
  // ('' | a known key | 'other'); the value actually stored in the form field is
  // the known key, or - for "other" - whatever the merchant types.
  const [platformChoice, setPlatformChoice] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');

  function selectPlatform(choice: string) {
    const next = platformChoice === choice ? '' : choice; // click again to clear
    setPlatformChoice(next);
    form.setValue(
      'customer_social_platform',
      next === 'other' ? customPlatform.trim() : next,
    );
  }

  function changeCustomPlatform(value: string) {
    setCustomPlatform(value);
    form.setValue('customer_social_platform', value.trim());
  }

  const create = useMutation({
    mutationFn: async (input: FormValues) => {
      // Empty optional fields go out as undefined, not "".
      const payload = {
        customer_name: input.customer_name || undefined,
        customer_phone: input.customer_phone || undefined,
        customer_email: input.customer_email || undefined,
        customer_social_handle: input.customer_social_handle || undefined,
        // A platform only travels with a handle it belongs to.
        customer_social_platform: input.customer_social_handle
          ? input.customer_social_platform || undefined
          : undefined,
        item: input.item,
        notes: input.notes || undefined,
        amount: input.amount,
        due_date: input.due_date || undefined,
      };
      const res = await api.post('/api/invoices', payload);
      return createInvoiceResponseSchema.parse(res.data);
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  if (merchant && merchant.status !== 'active') return null;

  const { errors } = form.formState;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          nativeButton={false}
          variant="ghost"
          size="icon-sm"
          aria-label="Back to invoices"
          render={
            <Link href="/invoices">
              <ArrowLeft />
            </Link>
          }
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
          <p className="text-sm text-muted-foreground">
            A fresh virtual account is generated for this sale.
          </p>
        </div>
      </div>

      {result ? (
        <Confirmation result={result} />
      ) : (
        <Card>
          <CardContent>
            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit((input) => create.mutate(input))}
              noValidate
            >
              <fieldset className="flex flex-col gap-5">
                {/* <legend className="mb-1 text-sm font-medium">What they bought</legend> */}

                <Field>
                  <Label htmlFor="item">Item</Label>
                  <Input
                    id="item"
                    placeholder="2 yards of ankara fabric"
                    className="h-11"
                    aria-invalid={!!errors.item}
                    {...form.register('item')}
                  />
                  <FieldError>{errors.item?.message}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="notes">
                    Notes{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Anything else about this sale"
                    aria-invalid={!!errors.notes}
                    {...form.register('notes')}
                  />
                  <FieldError>{errors.notes?.message}</FieldError>
                </Field>
              </fieldset>

              <fieldset className="flex flex-col gap-5">
                <legend className="text-sm font-medium">Buyer</legend>
                <p className="-mt-1 text-xs text-muted-foreground">
                  Identify the buyer by at least one of the following. A name is not
                  required if you only know their handle or number.
                </p>

                {/* The handle is the primary identifier for Instagram/WhatsApp
                    vendors, so it leads and spans the full width - room for the
                    platform picker above the handle itself. */}
                <Field>
                  <Label htmlFor="customer_social_handle">
                    Social handle{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Platform"
                  >
                    {SOCIAL_PLATFORMS.map((p) => {
                      const selected = platformChoice === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => selectPlatform(p.value)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                            selected
                              ? 'border-brand bg-brand text-brand-foreground'
                              : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {platformChoice === 'other' && (
                    <Input
                      aria-label="Platform name"
                      placeholder="Which platform?"
                      className="h-11"
                      value={customPlatform}
                      onChange={(e) => changeCustomPlatform(e.target.value)}
                    />
                  )}
                  <Input
                    id="customer_social_handle"
                    placeholder={
                      platformChoice === 'whatsapp' ? '08012345678' : '@chidi_styles'
                    }
                    className="h-11"
                    aria-invalid={!!errors.customer_social_handle}
                    {...form.register('customer_social_handle')}
                  />
                  <FieldError>{errors.customer_social_handle?.message}</FieldError>
                  <FieldError>{errors.customer_social_platform?.message}</FieldError>
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="customer_name">
                      Name{' '}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="customer_name"
                      placeholder="Chidi Okafor"
                      className="h-11"
                      aria-invalid={!!errors.customer_name}
                      {...form.register('customer_name')}
                    />
                  </Field>

                  <Field>
                    <Label htmlFor="customer_phone">
                      Phone{' '}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      placeholder="08012345678"
                      className="h-11"
                      aria-invalid={!!errors.customer_phone}
                      {...form.register('customer_phone')}
                    />
                    <FieldError>{errors.customer_phone?.message}</FieldError>
                  </Field>

                  <Field className="sm:col-span-2">
                    <Label htmlFor="customer_email">
                      Email{' '}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="customer_email"
                      type="email"
                      placeholder="chidi@example.com"
                      className="h-11"
                      aria-invalid={!!errors.customer_email}
                      {...form.register('customer_email')}
                    />
                    <FieldError>{errors.customer_email?.message}</FieldError>
                  </Field>
                </div>
                {/* The "at least one identifier" rule reports on customer_name. */}
                <FieldError>{errors.customer_name?.message}</FieldError>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <Input
                        id="amount"
                        inputMode="decimal"
                        placeholder="15,000"
                        className="h-11"
                        aria-invalid={!!errors.amount}
                        value={groupAmountInput(String(field.value ?? ''))}
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/[^\d.]/g, ''))
                        }
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  <FieldError>{errors.amount?.message}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="due_date">
                    Due date{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    className="h-11"
                    aria-invalid={!!errors.due_date}
                    {...form.register('due_date')}
                  />
                  <FieldError>{errors.due_date?.message}</FieldError>
                </Field>
              </div>

              {create.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {apiErrorMessage(create.error)}
                </p>
              )}

              <Button
                type="submit"
                className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={create.isPending}
              >
                {create.isPending ? 'Creating invoice…' : 'Create invoice'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
