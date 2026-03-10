import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1',
    'rounded px-1.5 py-0.5',
    'text-[10px] font-semibold leading-none',
    'tracking-[0.04em] uppercase',
    'border transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-600)]',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary filled
        default:
          'bg-[var(--accent-subtle)] text-[var(--accent-300)] border-[var(--border-accent)]',

        // Neutral secondary
        secondary:
          'bg-[var(--surface-overlay)] text-[var(--text-secondary)] border-[var(--border-subtle)]',

        // Severity — Critical
        destructive:
          'bg-[var(--severity-critical-bg)] text-[var(--severity-critical-fg)] border-[var(--severity-critical-border)]',

        // Outlined neutral
        outline:
          'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)]',

        // Severity — Low / Success
        success:
          'bg-[var(--severity-low-bg)] text-[var(--severity-low-fg)] border-[var(--severity-low-border)]',

        // Severity — Medium / Warning
        warning:
          'bg-[var(--severity-medium-bg)] text-[var(--severity-medium-fg)] border-[var(--severity-medium-border)]',

        // Severity — High / Error
        error:
          'bg-[var(--severity-high-bg)] text-[var(--severity-high-fg)] border-[var(--severity-high-border)]',

        // Info
        info:
          'bg-[var(--severity-info-bg)] text-[var(--severity-info-fg)] border-[var(--severity-info-border)]',

        // Threat levels (for backwards compatibility + explicit semantic naming)
        'threat-low':
          'bg-[var(--severity-low-bg)] text-[var(--severity-low-fg)] border-[var(--severity-low-border)]',
        'threat-medium':
          'bg-[var(--severity-medium-bg)] text-[var(--severity-medium-fg)] border-[var(--severity-medium-border)]',
        'threat-high':
          'bg-[var(--severity-high-bg)] text-[var(--severity-high-fg)] border-[var(--severity-high-border)]',
        'threat-critical':
          'bg-[var(--severity-critical-bg)] text-[var(--severity-critical-fg)] border-[var(--severity-critical-border)]',

        // Intel brand
        intel:
          'bg-[var(--accent-subtle)] text-[var(--accent-400)] border-[var(--border-accent)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  'data-ai-suggestion'?: boolean
  icon?: React.ReactNode
}

function Badge({
  className,
  variant,
  icon,
  children,
  'data-ai-suggestion': isAiSuggestion,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        className,
        isAiSuggestion ? 'ai-suggestion-badge' : ''
      )}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
