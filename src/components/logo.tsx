import { Sprout } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-lg bg-brand text-brand-foreground"
      >
        <Sprout className="size-4.5" />
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Sprout
        </span>
      )}
    </span>
  );
}
