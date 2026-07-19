'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

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
import { formatDateTime } from '@/lib/format';
import {
  connectAccountInputSchema,
  connectAccountResponseSchema,
  listConnectedAccountsResponseSchema,
  syncResponseSchema,
  type ConnectAccountInput,
  type ConnectedAccount,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ConnectedAccount['status'], string> = {
  connected: 'bg-brand/10 text-brand',
  disconnected: 'bg-muted text-muted-foreground',
  error: 'bg-destructive/10 text-destructive',
};

export default function ConnectedPage() {
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const accounts = useQuery({
    queryKey: ['connected-accounts'],
    queryFn: async () => {
      const res = await api.get('/api/connected-accounts');
      return listConnectedAccountsResponseSchema.parse(res.data).accounts;
    },
  });

  const form = useForm<ConnectAccountInput>({
    resolver: zodResolver(connectAccountInputSchema),
    defaultValues: {
      business_name: '',
      api_key: '',
      secret_key: '',
      contract_code: '',
    },
  });

  const connect = useMutation({
    mutationFn: async (input: ConnectAccountInput) => {
      const res = await api.post('/api/connected-accounts', input);
      return connectAccountResponseSchema.parse(res.data).account;
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
    },
  });

  const sync = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/connected-accounts/${id}/sync`);
      return syncResponseSchema.parse(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const disconnect = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/connected-accounts/${id}`);
    },
    onSuccess: () => {
      setConfirmingId(null);
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const { errors } = form.formState;
  const list = accounts.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Connected accounts</h1>
        <p className="text-sm text-muted-foreground">
          Already collect on Monnify? Connect that account to see its analytics alongside
          your Sprout sales.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-brand/30 bg-brand/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Read-only.</span> Sprout only
          reads your transaction history to build analytics. It never moves money, and you
          can disconnect at any time.
        </p>
      </div>

      {accounts.isPending ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading connected accounts…
          </CardContent>
        </Card>
      ) : accounts.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Connected accounts could not be loaded. Refresh to try again.
          </CardContent>
        </Card>
      ) : list.length > 0 ? (
        <div className="flex flex-col gap-3">
          {list.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.business_name}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        STATUS_STYLES[a.status],
                      )}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contract {a.contract_code} ·{' '}
                    {a.last_synced_at
                      ? `synced ${formatDateTime(a.last_synced_at)}`
                      : 'not synced yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {confirmingId === a.id ? (
                    <>
                      <span className="text-xs text-muted-foreground">Disconnect?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={disconnect.isPending}
                        onClick={() => disconnect.mutate(a.id)}
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
                        disabled={sync.isPending}
                        onClick={() => sync.mutate(a.id)}
                      >
                        <RefreshCw
                          data-icon="inline-start"
                          className={sync.isPending ? 'animate-spin' : ''}
                        />
                        Sync
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingId(a.id)}
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No accounts connected yet. Add one below to see its analytics alongside your
            Sprout sales.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-brand" />
            <CardTitle className="text-base">Connect an account</CardTitle>
          </div>
          <CardDescription>
            Enter the API key, secret key, and contract code from your Monnify dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit((input) => connect.mutate(input))}
            noValidate
          >
            <Field>
              <Label htmlFor="business_name">Account name</Label>
              <Input
                id="business_name"
                placeholder="My other store"
                className="h-11"
                aria-invalid={!!errors.business_name}
                {...form.register('business_name')}
              />
              <FieldError>{errors.business_name?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="api_key">API key</Label>
              <Input
                id="api_key"
                placeholder="MK_PROD_..."
                className="h-11"
                aria-invalid={!!errors.api_key}
                {...form.register('api_key')}
              />
              <FieldError>{errors.api_key?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="secret_key">Secret key</Label>
              <Input
                id="secret_key"
                type="password"
                placeholder="Your Monnify secret key"
                className="h-11"
                aria-invalid={!!errors.secret_key}
                {...form.register('secret_key')}
              />
              <FieldError>{errors.secret_key?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="contract_code">Contract code</Label>
              <Input
                id="contract_code"
                placeholder="Your Monnify contract code"
                className="h-11"
                aria-invalid={!!errors.contract_code}
                {...form.register('contract_code')}
              />
              <FieldError>{errors.contract_code?.message}</FieldError>
            </Field>

            {connect.isError && (
              <p role="alert" className="text-sm text-destructive">
                {apiErrorMessage(connect.error)}
              </p>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={connect.isPending}
            >
              {connect.isPending ? 'Connecting…' : 'Connect account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
