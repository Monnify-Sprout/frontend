import Link from 'next/link';

import { Logo } from '@/components/logo';

// Unauthenticated auth chrome: centered card, no dashboard navigation.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-muted/40 px-4 py-10">
      <Link href="/" aria-label="Sprout home">
        <Logo />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
