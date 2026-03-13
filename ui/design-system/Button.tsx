import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantClasses: Record<string, string> = {
  primary: 'bg-brand-primary text-white hover:bg-blue-500 active:bg-blue-600 focus:ring-brand-primary/40',
  secondary: 'bg-background-tertiary text-foreground-primary border border-border-default hover:bg-background-surface-dim active:bg-background-tertiary focus:ring-foreground-tertiary/30',
  ghost: 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-tertiary active:bg-background-tertiary/80 focus:ring-foreground-tertiary/20',
  danger: 'bg-semantic-error text-white hover:bg-red-600 active:bg-red-700 focus:ring-semantic-error/40',
  success: 'bg-semantic-success text-white hover:bg-green-600 active:bg-green-700 focus:ring-semantic-success/40',
};

const sizeClasses: Record<string, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-base gap-2.5 rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, iconPosition = 'left', children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-medium transition-all duration-fast',
          'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';
