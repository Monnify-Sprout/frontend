'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { LinkShare } from '@/components/link-share';
import { StreamPicker } from '@/components/stream-picker';
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
import { formatLinkAmount, groupAmountInput } from '@/lib/format';
import {
  createPaymentLinkFormSchema,
  createPaymentLinkResponseSchema,
  listCategoriesResponseSchema,
  type PaymentLink,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

type FormValues = z.input<typeof createPaymentLinkFormSchema>;

function Confirmation({ link }: { link: PaymentLink }) {
  return (
    <Card className="border-brand/30">
      <CardHeader className="items-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
          <CircleCheck className="size-7" />
        </span>
        <CardTitle className="text-xl">Payment link ready</CardTitle>
        <CardDescription>
          Share this link anywhere. Every payment lands as a collection you can track,
          and the link keeps working until you pause or end it.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">{link.title}</p>
          <p className="text-2xl font-semibold">{formatLinkAmount(link.amount)}</p>
          {link.item && <p className="text-xs text-muted-foreground">{link.item}</p>}
        </div>

        <LinkShare link={link} />

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/invoices/links/${link.id}`}>Open link</Link>}
          />
          <Button
            nativeButton={false}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
            render={<Link href="/invoices/links">Back to links</Link>}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewPaymentLinkPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { merchant, hydrated } = useAuthStore();
  const [result, setResult] = useState<PaymentLink | null>(null);

  useEffect(() => {
    if (hydrated && merchant && merchant.status !== 'active') {
      router.replace('/invoices/links');
    }
  }, [hydrated, merchant, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(createPaymentLinkFormSchema),
    defaultValues: {
      title: '',
      item: '',
      mode: 'fixed',
      amount: '',
      category_id: '',
      stream_id: '',
    },
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return listCategoriesResponseSchema.parse(res.data).categories;
    },
  });
  const selectedCategoryId = useWatch({ control: form.control, name: 'category_id' });
  // z.preprocess types its input as {}; the field only ever holds a string.
  const selectedStreamId = useWatch({ control: form.control, name: 'stream_id' }) as
    | string
    | undefined;
  const mode = useWatch({ control: form.control, name: 'mode' });

  const create = useMutation({
    mutationFn: async (input: FormValues) => {
      const payload = {
        title: input.title,
        item: input.item || undefined,
        // A buyer-entered link omits amount; a fixed link sends it.
        amount: input.mode === 'fixed' ? input.amount : undefined,
        category_id: input.category_id || undefined,
        stream_id: input.stream_id || undefined,
      };
      const res = await api.post('/api/payment-links', payload);
      return createPaymentLinkResponseSchema.parse(res.data).link;
    },
    onSuccess: (link) => {
      setResult(link);
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
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
          aria-label="Back to payment links"
          render={
            <Link href="/invoices/links">
              <ArrowLeft />
            </Link>
          }
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New payment link</h1>
          <p className="text-sm text-muted-foreground">
            A reusable link backed by a permanent account that keeps collecting.
          </p>
        </div>
      </div>

      {result ? (
        <Confirmation link={result} />
      ) : (
        <Card>
          <CardContent>
            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit((input) => create.mutate(input))}
              noValidate
            >
              <Field>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Ankara fabric bundle"
                  className="h-11"
                  aria-invalid={!!errors.title}
                  {...form.register('title')}
                />
                <FieldError>{errors.title?.message}</FieldError>
              </Field>

              <Field>
                <Label htmlFor="item">
                  What it&apos;s for{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="item"
                  placeholder="6 yards premium ankara"
                  className="h-11"
                  aria-invalid={!!errors.item}
                  {...form.register('item')}
                />
                <FieldError>{errors.item?.message}</FieldError>
              </Field>

              <Field>
                <Label>Price</Label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Pricing">
                  {(
                    [
                      { value: 'fixed', label: 'Fixed price' },
                      { value: 'open', label: 'Buyer decides' },
                    ] as const
                  ).map((p) => {
                    const selected = mode === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => form.setValue('mode', p.value)}
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
                {mode === 'fixed' ? (
                  <Controller
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <Input
                        inputMode="decimal"
                        placeholder="15,000"
                        className="h-11"
                        aria-label="Amount (NGN)"
                        aria-invalid={!!errors.amount}
                        value={groupAmountInput(String(field.value ?? ''))}
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/[^\d.]/g, ''))
                        }
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    The buyer enters how much to pay (useful for donations, top-ups, or
                    open orders).
                  </p>
                )}
                <FieldError>{errors.amount?.message}</FieldError>
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <Label htmlFor="category-picker">
                    Category{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Link
                    href="/categories"
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Manage
                  </Link>
                </div>
                {categories.data && categories.data.length > 0 ? (
                  <div
                    id="category-picker"
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Category"
                  >
                    <button
                      type="button"
                      aria-pressed={!selectedCategoryId}
                      onClick={() => form.setValue('category_id', '')}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                        !selectedCategoryId
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      None
                    </button>
                    {categories.data.map((c) => {
                      const selected = selectedCategoryId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => form.setValue('category_id', c.id)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                            selected
                              ? 'border-brand bg-brand text-brand-foreground'
                              : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <span
                            className="size-2.5 rounded-full ring-1 ring-black/10"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No categories yet.{' '}
                    <Link href="/categories" className="text-brand hover:underline">
                      Create one
                    </Link>{' '}
                    to group link revenue in analytics.
                  </p>
                )}
              </Field>

              <StreamPicker
                value={selectedStreamId || undefined}
                onChange={(id) => form.setValue('stream_id', id)}
              />

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
                {create.isPending ? 'Creating link…' : 'Create payment link'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
