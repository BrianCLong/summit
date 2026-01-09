import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default:
        'bg-[color:var(--ds-color-surface)] text-[color:var(--ds-color-foreground)] border-[color:var(--ds-color-border)]',
      destructive:
        'border-[color:var(--ds-color-error)] text-[color:var(--ds-color-error)] [&>svg]:text-[color:var(--ds-color-error)]',
      success:
        'border-[color:var(--ds-color-success)] text-[color:var(--ds-color-success)] [&>svg]:text-[color:var(--ds-color-success)]',
      warning:
        'border-[color:var(--ds-color-warning)] text-[color:var(--ds-color-warning)] [&>svg]:text-[color:var(--ds-color-warning)]',
      info: 'border-[color:var(--ds-color-info)] text-[color:var(--ds-color-info)] [&>svg]:text-[color:var(--ds-color-info)]',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-[var(--ds-radius-lg)] border p-[var(--ds-space-md)] [&>svg~*]:pl-[var(--ds-space-xl)] [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-[var(--ds-space-md)] [&>svg]:top-[var(--ds-space-md)] [&>svg]:text-[color:var(--ds-color-foreground)]',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = 'Alert';

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AlertTitle = React.forwardRef<HTMLParagraphElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn(
        'mb-[var(--ds-space-3xs)] font-[var(--ds-font-weight-semibold)] leading-[var(--ds-line-height-tight)] tracking-tight',
        className
      )}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'text-[var(--ds-font-size-sm)] [&_p]:leading-[var(--ds-line-height-relaxed)]',
        className
      )}
      {...props}
    />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
