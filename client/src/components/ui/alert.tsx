import * as React from 'react';
import { cn } from '@/lib/utils';

type AlertVariant = 'default' | 'destructive';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variantClasses: Record<AlertVariant, string> = {
  default: 'border-border bg-background text-foreground',
  destructive: 'border-red-500/50 text-red-900 dark:text-red-50 bg-red-50',
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm shadow-sm transition-colors',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = 'Alert';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };
