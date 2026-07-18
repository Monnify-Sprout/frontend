'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { formatNaira } from '@/lib/format';
import {
  createInvoiceInputSchema,
  createInvoiceResponseSchema,
} from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

// react-hook-form works with the schema's INPUT type (amount arrives as a
// string from the field and is coerced by zod).
type FormValues = z.input<typeof createInvoiceInputSchema>;
type CreateResult = z.infer<typeof createInvoiceResponseSchema>;

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
          Share these payment details with {invoice.customer_name}. The invoice
          is marked paid automatically once Monnify confirms the payment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Amount due</p>
          <p className="text-2xl font-semibold">{formatNaira(invoice.amount)}</p>
          <p className="text-xs text-muted-foreground">
            Ref {invoice.invoice_reference}
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
      customer_email: undefined,
      description: '',
      amount: '',
      due_date: undefined,
    },
  });

  const create = useMutation({
    mutationFn: async (input: FormValues) => {
      const payload = {
        ...input,
        customer_email: input.customer_email || undefined,
        description: input.description || undefined,
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
              className="flex flex-col gap-5"
              onSubmit={form.handleSubmit((input) => create.mutate(input))}
              noValidate
            >
              <Field>
                <Label htmlFor="customer_name">Customer name</Label>
                <Input
                  id="customer_name"
                  placeholder="Chidi Okafor"
                  className="h-11"
                  aria-invalid={!!errors.customer_name}
                  {...form.register('customer_name')}
                />
                <FieldError>{errors.customer_name?.message}</FieldError>
              </Field>

              <Field>
                <Label htmlFor="customer_email">
                  Customer email{' '}
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

              <Field>
                <Label htmlFor="description">
                  Description{' '}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="What is this payment for?"
                  aria-invalid={!!errors.description}
                  {...form.register('description')}
                />
                <FieldError>{errors.description?.message}</FieldError>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="15000"
                    className="h-11"
                    aria-invalid={!!errors.amount}
                    {...form.register('amount')}
                  />
                  <FieldError>{errors.amount?.message}</FieldError>
                </Field>

                <Field>
                  <Label htmlFor="due_date">
                    Due date{' '}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
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
