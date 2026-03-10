import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'font-medium tracking-[-0.01em]',
    'transition-all duration-150',
    'focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-[var(--accent-600)] focus-visible:ring-offset-1',
    'focus-visible:ring-offset-[var(--surface-base)]',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary action — filled accent
        default: [
          'bg-[var(--accent-600)] text-white',
          'hover:bg-[var(--accent-500)] active:bg-[var(--accent-700)]',
          'shadow-sm hover:shadow-glow-sm',
        ].join(' '),

        // Destructive action
        destructive: [
          'bg-[var(--severity-critical-solid)] text-white',
          'hover:bg-[#ef4444] active:bg-[#b91c1c]',
          'shadow-sm',
        ].join(' '),

        // Secondary outlined
        outline: [
          'bg-transparent text-[var(--text-primary)]',
          'border border-[var(--border-default)]',
          'hover:bg-[var(--surface-overlay)] hover:border-[var(--border-strong)]',
          'active:bg-[var(--surface-high)]',
        ].join(' '),

        // Neutral secondary filled
        secondary: [
          'bg-[var(--surface-overlay)] text-[var(--text-primary)]',
          'border border-[var(--border-subtle)]',
          'hover:bg-[var(--surface-high)] hover:border-[var(--border-default)]',
          'active:bg-[var(--surface-highest)]',
        ].join(' '),

        // Minimal ghost
        ghost: [
          'bg-transparent text-[var(--text-secondary)]',
          'hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]',
          'active:bg-[var(--surface-high)]',
        ].join(' '),

        // Text link
        link: [
          'bg-transparent text-[var(--text-accent)] underline-offset-4',
          'hover:underline hover:text-[var(--accent-300)]',
          'p-0 h-auto',
        ].join(' '),

        // Intel/brand primary (alias for default, kept for compatibility)
        intel: [
          'bg-[var(--accent-600)] text-white',
          'hover:bg-[var(--accent-500)] active:bg-[var(--accent-700)]',
          'shadow-sm hover:shadow-glow-sm',
        ].join(' '),

        // Critical/danger with subtle fill (for warnings that aren't full red)
        danger: [
          'bg-[var(--severity-critical-bg)] text-[var(--severity-critical-fg)]',
          'border border-[var(--severity-critical-border)]',
          'hover:bg-[var(--severity-critical-solid)] hover:text-white',
          'active:bg-[#b91c1c]',
        ].join(' '),
      },

      size: {
        xs:      'h-6 px-2 text-[11px] rounded-md gap-1',
        sm:      'h-7 px-3 text-[12px] rounded-md gap-1.5',
        default: 'h-8 px-3.5 text-[13px] rounded-md gap-2',
        lg:      'h-9 px-4 text-[14px] rounded-md gap-2',
        xl:      'h-10 px-5 text-[14px] rounded-md gap-2.5',
        icon:    'h-8 w-8 rounded-md',
        'icon-sm': 'h-7 w-7 rounded-md',
        'icon-xs': 'h-6 w-6 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isIconOnly = size === 'icon' || size === 'icon-sm' || size === 'icon-xs'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && !asChild ? (
          isIconOnly ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <>
              <Spinner className="h-3.5 w-3.5" />
              {children}
            </>
          )
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
