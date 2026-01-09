import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--ds-radius-md)] text-[var(--ds-font-size-sm)] font-[var(--ds-font-weight-medium)] leading-[var(--ds-line-height-standard)] ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        intel: 'bg-intel-600 text-white hover:bg-intel-700',
      },
      size: {
        default:
          'h-[var(--ds-space-3xl)] px-[var(--ds-space-md)] py-[var(--ds-space-xs)]',
        sm: 'h-[var(--ds-space-2xl)] rounded-[var(--ds-radius-sm)] px-[var(--ds-space-sm)]',
        lg: 'h-[var(--ds-space-3xl)] rounded-[var(--ds-radius-lg)] px-[var(--ds-space-xl)] text-[var(--ds-font-size-md)]',
        icon: 'h-[var(--ds-space-3xl)] w-[var(--ds-space-3xl)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
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
    const isIcon = size === 'icon'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && !asChild ? (
          isIcon ? (
            <Spinner />
          ) : (
            <>
              <Spinner className="mr-2" />
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
