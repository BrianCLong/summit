import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

const badgeVariants = cva(
  'inline-flex items-center rounded-[var(--ds-radius-pill)] border px-[var(--ds-space-sm)] py-[var(--ds-space-3xs)] text-[var(--ds-font-size-xs)] font-[var(--ds-font-weight-semibold)] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-[color:var(--ds-color-success)] text-white',
        warning:
          'border-transparent bg-[color:var(--ds-color-warning)] text-white',
        error:
          'border-transparent bg-[color:var(--ds-color-error)] text-white',
        info: 'border-transparent bg-[color:var(--ds-color-info)] text-white',
        // IntelGraph specific variants
        'threat-low':
          'border-transparent bg-[color:var(--ds-color-success)] text-white',
        'threat-medium':
          'border-transparent bg-[color:var(--ds-color-warning)] text-white',
        'threat-high':
          'border-transparent bg-[color:var(--ds-color-warning)] text-white',
        'threat-critical':
          'border-transparent bg-[color:var(--ds-color-error)] text-white',
        intel:
          'border-transparent bg-intel-600 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
      'data-ai-suggestion'?: boolean;
    }

function Badge({ className, variant, 'data-ai-suggestion': isAiSuggestion, ...props }: BadgeProps) {
  // We can't use useSelector here if Badge is used outside of Redux context or in a pure presentation way
  // But Badge is a UI component.
  // Ideally, the parent should hide it, but "Invisible Hand" implies a global toggle that hides ALL badges that might be AI.
  // If we can't easily hook into store here without breaking tests or Storybook, we should use a CSS class approach.
  // The 'invisibleHandMode' adds a class to the body, and we use CSS to hide things.
  // Let's rely on the body class 'invisible-hand-mode' which we can set in App.tsx or similar.

  return (
    <div className={cn(badgeVariants({ variant }), className, isAiSuggestion ? 'ai-suggestion-badge' : '')} {...props} />
  )
}

export { Badge, badgeVariants }
