export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-background px-6 text-center font-sans">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-block size-8 rounded-lg bg-brand"
        />
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          Sprout
        </span>
      </div>

      <div className="flex max-w-md flex-col items-center gap-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          Get paid. Understand your sales.
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Invoicing and analytics for every Nigerian merchant — verified by BVN
          or NIN, settled through Monnify.
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Frontend foundation lands in Phase 5. Backend is being built now.
      </p>
    </div>
  );
}
