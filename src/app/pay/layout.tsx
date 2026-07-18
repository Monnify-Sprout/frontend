import { Logo } from '@/components/logo';

// Public invoice-payment chrome: what a BUYER sees when a merchant shares a
// payment link. Deliberately separate from the dashboard layout — no nav, no
// session, just the invoice (build plan Phase 5: no shared chrome).
export default function PayLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col items-center bg-muted/40 px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <Logo />
        {children}
        <p className="text-xs text-muted-foreground">
          Payments are processed securely through Monnify.
        </p>
      </div>
    </div>
  );
}
