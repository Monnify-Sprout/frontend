'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarDays,
  ChartNoAxesColumn,
  Clock,
  Landmark,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  listInvoicesResponseSchema,
  meResponseSchema,
  type Merchant,
} from '@/lib/schemas';
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
      className: 'bg-amber-100 text-amber-700',
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

// Stat card in harmony-admin's style: a soft tinted icon chip with a saturated
// icon, small muted title, large value.
function StatCard({
  icon: Icon,
  chipClass,
  title,
  value,
  valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  chipClass: string;
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="gap-3">
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-lg',
            chipClass,
          )}
        >
          <Icon className="size-5" />
        </span>
        <CardDescription>{title}</CardDescription>
        <CardTitle className={cn('text-2xl font-semibold', valueClass)}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
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

  const invoices = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const res = await api.get('/api/invoices');
      return listInvoicesResponseSchema.parse(res.data).invoices;
    },
  });

  const merchant = me.data ?? cached;
  if (!merchant) return null;

  const firstName = merchant.owner_name.split(' ')[0];
  const memberSince = new Date(merchant.created_at).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
                  'Your identity check failed. Our team will review it.')
                : 'Verify your BVN or NIN to activate payments. The verification flow arrives in the next phase of the build.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          chipClass={
            merchant.status === 'active'
              ? 'bg-brand/10 text-brand'
              : 'bg-amber-100 text-amber-600'
          }
          title="Account status"
          value={merchant.status}
          valueClass="capitalize"
        />
        <StatCard
          icon={ReceiptText}
          chipClass="bg-blue-100 text-blue-600"
          title="Invoices"
          value={invoices.isPending ? '…' : String(invoices.data?.length ?? 0)}
        />
        <StatCard
          icon={Landmark}
          chipClass="bg-violet-100 text-violet-600"
          title="Sub-account"
          value={merchant.sub_account_code ?? 'Not yet assigned'}
          valueClass={merchant.sub_account_code ? 'text-lg break-all' : 'text-lg'}
        />
        <StatCard
          icon={CalendarDays}
          chipClass="bg-rose-100 text-rose-600"
          title="Member since"
          value={memberSince}
          valueClass="text-lg"
        />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <ChartNoAxesColumn className="size-5" />
          </span>
          <CardTitle>Invoices &amp; analytics</CardTitle>
          <CardDescription>
            Invoice creation, payment tracking and your sales analytics land
            here in the next build phases. The backend for all of it is already
            live.
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
