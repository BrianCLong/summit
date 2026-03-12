import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
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
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  'data-ai-suggestion'?: boolean
  icon?: React.ReactNode
  accessibleStatus?: boolean
}

const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-3 w-3" />,
  'threat-low': <CheckCircle2 className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  'threat-medium': <AlertTriangle className="h-3 w-3" />,
  'threat-high': <AlertTriangle className="h-3 w-3" />,
  error: <AlertCircle className="h-3 w-3" />,
  'threat-critical': <AlertCircle className="h-3 w-3" />,
  destructive: <AlertCircle className="h-3 w-3" />,
  info: <Info className="h-3 w-3" />,
}

function Badge({
  className,
  variant,
  icon,
  accessibleStatus = false,
  children,
  'data-ai-suggestion': isAiSuggestion,
  ...props
}: BadgeProps) {
  const statusIcon =
    accessibleStatus && variant && statusIcons[variant]
      ? statusIcons[variant]
      : null
  const finalIcon = icon || statusIcon

  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        className,
        isAiSuggestion ? 'ai-suggestion-badge' : ''
      )}
      {...props}
    >
      {finalIcon && <span className="mr-1.5 flex items-center">{finalIcon}</span>}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
