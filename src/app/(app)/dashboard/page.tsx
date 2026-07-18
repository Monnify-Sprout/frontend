'use client';

import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Clock, ShieldAlert } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import { meResponseSchema, type Merchant } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

function StatusBadge({ merchant }: { merchant: Merchant }) {
  const map = {
    verified: {
      icon: BadgeCheck,
      text: 'Verified',
      className: 'bg-brand/10 text-brand',
    },
    pending: {
      icon: Clock,
      text: 'Verification pending',
      className: 'bg-muted text-muted-foreground',
    },
    failed: {
      icon: ShieldAlert,
      text: 'Verification failed',
      className: 'bg-destructive/10 text-destructive',
    },
  } as const;
  const { icon: Icon, text, className } = map[merchant.verification_status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        className,
      )}
    >
      <Icon className="size-3.5" />
      {text}
    </span>
  );
}

export default function DashboardPage() {
  const { merchant: cached, setMerchant } = useAuthStore();

  // Revalidate the session's merchant on load; the store keeps the last copy
  // for instant paint.
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

  const firstName = merchant.owner_name.split(' ')[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s where {merchant.business_name} stands today.
          </p>
        </div>
        <StatusBadge merchant={merchant} />
      </div>

      {merchant.status !== 'active' && (
        <Card className="border-brand/30 bg-brand/5">
          <CardHeader>
            <CardTitle>Finish setting up</CardTitle>
            <CardDescription>
              {merchant.verification_status === 'failed'
                ? (merchant.verification_reason ??
                  'Your identity check failed — our team will review it.')
                : 'Verify your BVN or NIN to activate payments. The verification flow arrives in the next phase of the build.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Account status</CardDescription>
            <CardTitle className="text-xl capitalize">{merchant.status}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sub-account</CardDescription>
            <CardTitle className="text-xl">
              {merchant.sub_account_code ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Member since</CardDescription>
            <CardTitle className="text-xl">
              {new Date(merchant.created_at).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices &amp; analytics</CardTitle>
          <CardDescription>
            Invoice creation, payment tracking and your sales analytics land here
            in the next build phases — the backend for all of it is already live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Coming in Phase 6 &amp; 7
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
