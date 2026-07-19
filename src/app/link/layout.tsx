import { Logo } from '@/components/logo';

// Public payment-link chrome: what a BUYER sees when a merchant shares a static
// payment link. Same shape as the /pay invoice chrome - no nav, no session -
// kept as its own layout so the two public flows stay independent.
export default function LinkLayout({
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
