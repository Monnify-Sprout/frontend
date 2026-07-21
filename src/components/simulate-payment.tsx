'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { api, apiErrorMessage } from '@/lib/api';
import { simulateInvoicePaymentResponseSchema } from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

// Demo-only affordance: pay a pending invoice via the backend's mock webhook path
// so a judge (or anyone on the mock demo) can complete the flow without a real
// bank transfer. Renders nothing unless the merchant is on mock verification, so
// it never appears on a live account. Mirrors the payment-link "Simulate a
// payment" action; the backend refuses this under live mode regardless.
export function SimulatePayment({ invoiceId }: { invoiceId: string }) {
  const { merchant } = useAuthStore();
  const queryClient = useQueryClient();

  const simulate = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/invoices/${invoiceId}/simulate-payment`);
      return simulateInvoicePaymentResponseSchema.parse(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  if (merchant?.verification_mode !== 'mock') return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-brand/40 bg-brand/5 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="size-3.5 text-brand" />
        Demo mode
      </div>
      <p className="text-sm text-muted-foreground">
        Mark this invoice as paid to try the full flow, no real transfer needed.
      </p>
      <Button
        size="sm"
        className="self-start bg-brand text-brand-foreground hover:bg-brand/90"
        disabled={simulate.isPending}
        onClick={() => simulate.mutate()}
      >
        {simulate.isPending ? 'Simulating…' : 'Simulate a payment'}
      </Button>
      {simulate.isError && (
        <p role="alert" className="text-sm text-destructive">
          {apiErrorMessage(simulate.error)}
        </p>
      )}
    </div>
  );
}
