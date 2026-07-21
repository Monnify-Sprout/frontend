'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type SubmitErrorHandler } from 'react-hook-form';
import { z } from 'zod';

import { InvoiceShare } from '@/components/invoice-share';
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
import { Textarea } from '@/components/ui/textarea';
import { api, apiErrorMessage } from '@/lib/api';
import { customerLabel, formatNaira, groupAmountInput } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  createInvoiceInputSchema,
  createInvoiceResponseSchema,
  listCategoriesResponseSchema,
} from '@/lib/schemas';
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

// PREVIEW: two candidate layouts for the progressive-disclosure redesign, chosen
// by a toggle at the top of the form. `lean` shows only Item, Amount, and one
// buyer field, tucking the rest (extra contacts, category, due date, notes)
// behind "Add more details". `full` keeps the whole Buyer block visible and
// only collapses category, due date, and notes. Once a layout is picked, drop
// the toggle and the unused branch.
type Variant = 'lean' | 'full';

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

  // PREVIEW toggle state + the disclosure open/closed state.
  const [variant, setVariant] = useState<Variant>('lean');
  const [showMore, setShowMore] = useState(false);

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
      category_id: '',
      stream_id: '',
    },
  });

  // Merchant categories for the picker (Phase 11).
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return listCategoriesResponseSchema.parse(res.data).categories;
    },
  });
  const values = useWatch({ control: form.control });
  const selectedCategoryId = values.category_id;
  // z.preprocess types its input as {}; the field only ever holds a string.
  const selectedStreamId = values.stream_id as string | undefined;

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
        category_id: input.category_id || undefined,
        stream_id: input.stream_id || undefined,
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

  // Fields that live inside the collapsed section, per variant. A validation
  // error must never hide behind the disclosure, so we auto-open it if the
  // submit attempt flags one of these.
  const leanContactFields = [
    'customer_phone',
    'customer_email',
    'customer_social_handle',
    'customer_social_platform',
  ] as const;
  const collapsedFields =
    variant === 'lean'
      ? ([...leanContactFields, 'notes', 'due_date', 'category_id', 'stream_id'] as const)
      : (['notes', 'due_date', 'category_id', 'stream_id'] as const);

  // A small "N added" hint on the disclosure header so collapsed data is never
  // invisible. Counts the optional fields that currently hold a value.
  const filledCount = collapsedFields.filter((name) => {
    if (name === 'customer_social_platform') return false; // rides with the handle
    return Boolean((values as Record<string, unknown>)[name]);
  }).length;

  // handleSubmit passes the freshly-computed errors; the destructured `errors`
  // above is a render behind on the first failed submit, so read the argument.
  const onInvalid: SubmitErrorHandler<FormValues> = (formErrors) => {
    if (collapsedFields.some((name) => formErrors[name])) setShowMore(true);
  };

  // The social-handle field (platform pills + handle input). Shared by both
  // layouts; it leads the Buyer block in `full` and lives in the disclosure in
  // `lean`.
  const socialHandleField = (
    <Field>
      <Label htmlFor="customer_social_handle">
        Social handle{' '}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Platform">
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
        placeholder={platformChoice === 'whatsapp' ? '08012345678' : '@chidi_styles'}
        className="h-11"
        aria-invalid={!!errors.customer_social_handle}
        {...form.register('customer_social_handle')}
      />
      <FieldError>{errors.customer_social_handle?.message}</FieldError>
      <FieldError>{errors.customer_social_platform?.message}</FieldError>
    </Field>
  );

  const nameField = (
    <Field>
      <Label htmlFor="customer_name">
        Name <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Input
        id="customer_name"
        placeholder="Chidi Okafor"
        className="h-11"
        aria-invalid={!!errors.customer_name}
        {...form.register('customer_name')}
      />
    </Field>
  );

  const phoneField = (
    <Field className="sm:col-span-2">
      <Label htmlFor="customer_phone">
        Phone <span className="font-normal text-muted-foreground">(optional)</span>
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
  );

  const emailField = (
    <Field className="sm:col-span-2">
      <Label htmlFor="customer_email">
        Email <span className="font-normal text-muted-foreground">(optional)</span>
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
  );

  const categoryField = (
    <Field>
      <div className="flex items-center justify-between">
        <Label htmlFor="category-picker">
          Category <span className="font-normal text-muted-foreground">(optional)</span>
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
          to group your sales.
        </p>
      )}
    </Field>
  );

  const dueDateField = (
    <Field>
      <Label htmlFor="due_date">
        Due date <span className="font-normal text-muted-foreground">(optional)</span>
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
  );

  const notesField = (
    <Field>
      <Label htmlFor="notes">
        Notes <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Textarea
        id="notes"
        placeholder="Anything else about this sale"
        aria-invalid={!!errors.notes}
        {...form.register('notes')}
      />
      <FieldError>{errors.notes?.message}</FieldError>
    </Field>
  );

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
            {/* PREVIEW: layout comparison toggle. Remove once a layout is chosen. */}
            {/* <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-3">
              <span className="text-xs font-medium text-muted-foreground">
                Preview layout
              </span>
              <div
                className="flex gap-1 rounded-md bg-muted p-1"
                role="group"
                aria-label="Preview layout"
              >
                {(
                  [
                    { value: 'lean', label: 'Lean' },
                    { value: 'full', label: 'Keep buyer visible' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={variant === opt.value}
                    onClick={() => setVariant(opt.value)}
                    className={cn(
                      'rounded px-3 py-1 text-sm font-medium transition-colors',
                      variant === opt.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div> */}

            <form
              className="flex flex-col gap-6"
              onSubmit={form.handleSubmit((input) => create.mutate(input), onInvalid)}
              noValidate
            >
              {/* Essentials: always visible. */}
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

              {variant === 'full' ? (
                <fieldset className="flex flex-col gap-5">
                  <legend className="text-sm font-medium">Buyer</legend>
                  <p className="-mt-1 text-xs text-muted-foreground">
                    Identify the buyer by at least one of the following. A name is not
                    required if you only know their handle or number.
                  </p>
                  {socialHandleField}
                  <div className="grid gap-5 sm:grid-cols-2">
                    {nameField}
                    {phoneField}
                    {emailField}
                  </div>
                  {/* The "at least one identifier" rule reports on customer_name. */}
                  <FieldError>{errors.customer_name?.message}</FieldError>
                </fieldset>
              ) : (
                <Field>
                  <Label htmlFor="customer_name">Customer</Label>
                  <p className="-mt-1 text-xs text-muted-foreground">
                    Name, phone, email, or social handle. At least one; add the rest under
                    &quot;Add more details&quot;.
                  </p>
                  <Input
                    id="customer_name"
                    placeholder="Chidi Okafor"
                    className="h-11"
                    aria-invalid={!!errors.customer_name}
                    {...form.register('customer_name')}
                  />
                  <FieldError>{errors.customer_name?.message}</FieldError>
                </Field>
              )}

              {/* Disclosure: everything optional. */}
              <div className="rounded-lg border">
                <button
                  type="button"
                  aria-expanded={showMore}
                  onClick={() => setShowMore((v) => !v)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-foreground"
                >
                  <ChevronDown
                    className={cn(
                      'size-4 text-muted-foreground transition-transform',
                      showMore && 'rotate-180',
                    )}
                  />
                  Add more details
                  {filledCount > 0 && (
                    <span className="ml-auto rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      {filledCount} added
                    </span>
                  )}
                </button>

                {showMore && (
                  <div className="flex flex-col gap-5 border-t px-4 py-5">
                    {variant === 'lean' && (
                      <div className="flex flex-col gap-5">
                        <p className="text-xs font-medium text-muted-foreground">
                          More ways to reach the buyer
                        </p>
                        {socialHandleField}
                        <div className="grid gap-5 sm:grid-cols-2">
                          {phoneField}
                          {emailField}
                        </div>
                      </div>
                    )}
                    {categoryField}
                    <StreamPicker
                      value={selectedStreamId || undefined}
                      onChange={(id) => form.setValue('stream_id', id)}
                    />
                    {dueDateField}
                    {notesField}
                  </div>
                )}
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
