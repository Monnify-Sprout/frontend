import { Sprout } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/logo';

// Split auth chrome (pattern ported from harmony-admin's (auth) layout): a huge
// brand panel on the left — gradient bg, small logo top-left, centered mark +
// tagline — and the form on the right. Panel hides below lg; a compact logo
// header takes over on mobile.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-1">
      <div className="relative hidden flex-[5] items-center justify-center overflow-hidden bg-linear-to-br from-[oklch(0.62_0.16_150)] via-[oklch(0.5_0.15_152)] to-[oklch(0.36_0.12_155)] lg:flex">
        <Link
          href="/"
          aria-label="Sprout home"
          className="absolute top-6 left-6 flex items-center gap-2 text-white"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
            <Sprout className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Sprout</span>
        </Link>

        {/* Oversized watermark, harmony-style depth without a photo asset. */}
        <Sprout
          aria-hidden
          className="absolute -right-24 -bottom-24 size-[28rem] text-white/10"
          strokeWidth={1}
        />

        <div className="flex max-w-md flex-col items-center gap-6 px-10 text-center text-white">
          <span className="flex size-20 items-center justify-center rounded-3xl bg-white/15 shadow-lg backdrop-blur-sm">
            <Sprout className="size-11" />
          </span>
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Get paid. Understand your sales.
          </h2>
          <p className="text-sm leading-6 text-white/80">
            Invoicing and analytics for every Nigerian merchant — verified by
            BVN or NIN, settled through Monnify.
          </p>
        </div>
      </div>

      <div className="flex flex-[6] flex-col">
        <div className="flex justify-center pt-8 lg:hidden">
          <Link href="/" aria-label="Sprout home">
            <Logo />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-105">{children}</div>
        </div>
      </div>
    </div>
  );
}
