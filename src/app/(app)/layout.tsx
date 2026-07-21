'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  ChartNoAxesColumn,
  LayoutDashboard,
  Link2,
  LogOut,
  ReceiptText,
  Tag,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { AuthGuard } from '@/components/auth-guard';
import { Logo } from '@/components/logo';
import { StreamSwitcher } from '@/components/stream-switcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useStreamStore } from '@/store/stream';

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, ready: true },
  { label: 'Invoices', href: '/invoices', icon: ReceiptText, ready: true },
  { label: 'Analytics', href: '/analytics', icon: ChartNoAxesColumn, ready: true },
  { label: 'Categories', href: '/categories', icon: Tag, ready: true },
  { label: 'Connected', href: '/connected', icon: Link2, ready: true },
] as const;

// Streams is a workspace concept (set from the header switcher), not a content
// page, so it sits apart from the primary nav - pinned to the bottom of the
// sidebar and set off in the mobile bar.
const STREAMS_NAV = {
  label: 'Streams',
  href: '/streams',
  icon: Waypoints,
} as const;

// Authenticated dashboard chrome, deliberately separate from the public
// invoice-payment and auth layouts (build plan Phase 5: no shared chrome).
// Desktop gets a sidebar; mobile keeps navigation via a bottom tab bar.
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { clear } = useAuthStore();
  const clearStream = useStreamStore((s) => s.clear);
  const isActive = (href: string) => pathname.startsWith(href);

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
                    isActive(href)
                      ? 'bg-brand/10 text-brand'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                    soon
                  </span>
                </span>
              ),
            )}

            {/* Streams sits apart at the bottom - it is the workspace, not a
                content page (switch streams from the header). */}
            <div className="mt-auto flex flex-col gap-1 border-t pt-3">
              <Link
                href={STREAMS_NAV.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(STREAMS_NAV.href)
                    ? 'bg-brand/10 text-brand'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <STREAMS_NAV.icon className="size-4" />
                {STREAMS_NAV.label}
              </Link>
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Logo compact className="md:hidden" />
              <StreamSwitcher />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Drop every cached query so the next merchant to sign in never
                // sees the previous session's data (invoices, analytics, etc.).
                queryClient.clear();
                clear();
                clearStream();
                router.replace('/login');
              }}
            >
              <LogOut data-icon="inline-start" />
              Log out
            </Button>
          </header>
          <main className="flex flex-1 flex-col bg-muted/30 p-4 pb-24 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom tab bar: keeps navigation available below md. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/95 backdrop-blur-sm md:hidden">
        {NAV.map(({ label, href, icon: Icon, ready }) =>
          ready ? (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5',
                isActive(href) ? 'text-brand' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ) : (
            <span
              key={href}
              aria-disabled
              className="flex flex-1 cursor-default flex-col items-center gap-1 py-2.5 text-muted-foreground/60"
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </span>
          ),
        )}
        {/* Streams set off from the content tabs by a divider. */}
        <Link
          href={STREAMS_NAV.href}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 border-l py-2.5',
            isActive(STREAMS_NAV.href) ? 'text-brand' : 'text-muted-foreground',
          )}
        >
          <STREAMS_NAV.icon className="size-5" />
          <span className="text-[10px] font-medium">{STREAMS_NAV.label}</span>
        </Link>
      </nav>
    </AuthGuard>
  );
}
