import Link from 'next/link';

import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-6 text-center font-sans">
      <Logo className="scale-125" />

      <div className="flex max-w-md flex-col items-center gap-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          Get paid. Understand your sales.
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Invoicing and analytics for every Nigerian merchant — verified by BVN
          or NIN, settled through Monnify.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="lg"
          nativeButton={false}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
          render={<Link href="/register">Get started</Link>}
        />
        <Button
          size="lg"
          nativeButton={false}
          variant="outline"
          render={<Link href="/login">Sign in</Link>}
        />
      </div>
    </div>
  );
}
