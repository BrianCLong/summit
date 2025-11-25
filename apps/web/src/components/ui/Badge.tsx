import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
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
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        warning:
          'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        error:
          'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        // IntelGraph specific variants
        'threat-low':
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'threat-medium':
          'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'threat-high':
          'border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        'threat-critical':
          'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        intel:
          'border-transparent bg-intel-100 text-intel-800 dark:bg-intel-900 dark:text-intel-300',
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
