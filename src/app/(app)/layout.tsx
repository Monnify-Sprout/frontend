'use client';

import {
  ChartNoAxesColumn,
  LayoutDashboard,
  Link2,
  LogOut,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AuthGuard } from '@/components/auth-guard';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, ready: true },
  { label: 'Invoices', href: '/invoices', icon: ReceiptText, ready: false },
  { label: 'Analytics', href: '/analytics', icon: ChartNoAxesColumn, ready: false },
  { label: 'Connected accounts', href: '/connected', icon: Link2, ready: false },
] as const;

// Authenticated dashboard chrome — deliberately separate from the public
// invoice-payment and auth layouts (build plan Phase 5: no shared chrome).
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { merchant, clear } = useAuthStore();

  return (
    <AuthGuard>
      <div className="flex min-h-svh flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/dashboard" aria-label="Sprout dashboard">
              <Logo />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV.map(({ label, href, icon: Icon, ready }) =>
              ready ? (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'bg-brand/10 text-brand',
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ) : (
                <span
                  key={href}
                  aria-disabled
                  className="flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/70"
                >
                  <Icon className="size-4" />
                  {label}
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    soon
                  </span>
                </span>
              ),
            )}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
            <div className="min-w-0 md:hidden">
              <Logo compact />
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm font-medium">
                {merchant?.business_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {merchant?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clear();
                router.replace('/login');
              }}
            >
              <LogOut data-icon="inline-start" />
              Log out
            </Button>
          </header>
          <main className="flex flex-1 flex-col bg-muted/30 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
