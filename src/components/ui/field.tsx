import { cn } from '@/lib/utils';

// Small form-field composition helpers used with react-hook-form: a vertical
// Label + Input + FieldError stack. Keeps page-level forms terse.

function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function FieldError({
  className,
  children,
  ...props
}: React.ComponentProps<'p'>) {
  if (!children) return null;
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn('text-sm text-destructive', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export { Field, FieldError };
