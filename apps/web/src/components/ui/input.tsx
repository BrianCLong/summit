import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, helpText, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const messageId = `${inputId}-help`;
    const errorId = `${inputId}-error`;
    const describedBy = error ? errorId : helpText ? messageId : undefined;

    const inputField = (
      <input
        type={type}
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={cn(
          'flex h-[var(--ds-space-3xl)] w-full rounded-[var(--ds-radius-md)] border border-input bg-background px-[var(--ds-space-md)] py-[var(--ds-space-xs)] text-[var(--ds-font-size-sm)] ring-offset-background file:border-0 file:bg-transparent file:text-[var(--ds-font-size-sm)] file:font-[var(--ds-font-weight-medium)] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (!label && !helpText && !error) {
      return inputField;
    }

    return (
      <div className="grid gap-[var(--ds-space-2xs)]">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[var(--ds-font-size-sm)] font-[var(--ds-font-weight-medium)] text-[color:var(--ds-color-foreground)]"
          >
            {label}
          </label>
        )}
        {inputField}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-[var(--ds-font-size-xs)] text-[color:var(--ds-color-error)]"
          >
            {error}
          </p>
        ) : helpText ? (
          <p
            id={messageId}
            className="text-[var(--ds-font-size-xs)] text-muted-foreground"
          >
            {helpText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
