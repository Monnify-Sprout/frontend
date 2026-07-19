'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Tag } from 'lucide-react';
import { useState } from 'react';

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
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '@/lib/category-colors';
import {
  categoryInputSchema,
  categoryResponseSchema,
  listCategoriesResponseSchema,
  type Category,
  type CategoryInput,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';

// A row of preset colour swatches; the selected one shows a check.
function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
      {CATEGORY_COLORS.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={cn(
              'flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110',
              selected
                ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                : 'ring-1 ring-black/10',
            )}
          >
            {selected && <Check className="size-4 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

// Inline editor shared by the create form and per-row edit. Local draft state so
// typing/colour changes don't fire on every keystroke.
function CategoryForm({
  initialName = '',
  initialColor = DEFAULT_CATEGORY_COLOR,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialColor?: string;
  submitLabel: string;
  pending: boolean;
  error?: string;
  onSubmit: (input: CategoryInput) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [invalid, setInvalid] = useState<string | null>(null);

  const submit = () => {
    const parsed = categoryInputSchema.safeParse({ name, color });
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? 'Check the details');
      return;
    }
    setInvalid(null);
    onSubmit(parsed.data);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fabric, Ready-to-wear"
          className="h-11"
          maxLength={40}
          aria-invalid={!!invalid}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
      </Field>
      <Field>
        <Label>Colour</Label>
        <ColorSwatches value={color} onChange={setColor} />
      </Field>

      {(invalid || error) && <FieldError>{invalid ?? error}</FieldError>}

      <div className="flex gap-2">
        <Button
          type="button"
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={pending}
          onClick={submit}
        >
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/categories');
      return listCategoriesResponseSchema.parse(res.data).categories;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    // A rename/recolour/delete changes how invoices + analytics render.
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const create = useMutation({
    mutationFn: async (input: CategoryInput) => {
      const res = await api.post('/api/categories', input);
      return categoryResponseSchema.parse(res.data).category;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CategoryInput }) => {
      const res = await api.patch(`/api/categories/${id}`, input);
      return categoryResponseSchema.parse(res.data).category;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/categories/${id}`);
    },
    onSuccess: () => {
      setConfirmingId(null);
      invalidate();
    },
  });

  const list = categories.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Group your sales your own way. Tag an invoice with a category to see how each
          part of your business is doing in analytics.
        </p>
      </div>

      {categories.isPending ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading categories…
          </CardContent>
        </Card>
      ) : categories.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Categories could not be loaded. Refresh to try again.
          </CardContent>
        </Card>
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((c: Category) =>
            editingId === c.id ? (
              <Card key={c.id}>
                <CardContent>
                  <CategoryForm
                    initialName={c.name}
                    initialColor={c.color}
                    submitLabel="Save changes"
                    pending={update.isPending}
                    error={update.isError ? apiErrorMessage(update.error) : undefined}
                    onSubmit={(input) => update.mutate({ id: c.id, input })}
                    onCancel={() => setEditingId(null)}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card key={c.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.invoice_count ?? 0}{' '}
                        {(c.invoice_count ?? 0) === 1 ? 'invoice' : 'invoices'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {confirmingId === c.id ? (
                      <>
                        <span className="text-xs text-muted-foreground">Delete?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(c.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setConfirmingId(null);
                            setEditingId(c.id);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setConfirmingId(c.id);
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ),
          )}
          {confirmingId && (
            <p className="text-xs text-muted-foreground">
              Deleting a category keeps its invoices, it just removes the tag from them.
            </p>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader className="items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Tag className="size-6" />
            </span>
            <CardTitle className="text-xl">No categories yet</CardTitle>
            <CardDescription>
              Create your first category below, then pick it when you raise an invoice.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="size-5 text-brand" />
            <CardTitle className="text-base">New category</CardTitle>
          </div>
          <CardDescription>Give it a name and a colour.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* key remounts the form (clearing it) after each successful create. */}
          <CategoryForm
            key={create.isSuccess ? create.data?.id : 'new'}
            submitLabel="Add category"
            pending={create.isPending}
            error={create.isError ? apiErrorMessage(create.error) : undefined}
            onSubmit={(input) => create.mutate(input)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
