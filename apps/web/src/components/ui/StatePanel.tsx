import * as React from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from './EmptyState'
import { Button } from './Button'
import { Spinner } from './Spinner'
import { cn } from '@/lib/utils'

export type StatePanelVariant = 'loading' | 'error' | 'empty'

interface StatePanelAction {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'outline'
}

interface StatePanelProps {
  variant: StatePanelVariant
  title: string
  description?: string
  action?: StatePanelAction
  secondaryAction?: StatePanelAction
  icon?: 'search' | 'file' | 'alert' | 'plus' | React.ReactNode
  className?: string
}

const ActionButton = ({ action }: { action: StatePanelAction }) => {
  if (action.href) {
    return (
      <Button asChild variant={action.variant || 'default'}>
        <Link to={action.href}>{action.label}</Link>
      </Button>
    )
  }

  return (
    <Button
      onClick={action.onClick}
      variant={action.variant || 'default'}
    >
      {action.label}
    </Button>
  )
}

export function StatePanel({
  variant,
  title,
  description,
  action,
  secondaryAction,
  icon,
  className,
}: StatePanelProps) {
  if (variant === 'loading') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center p-8',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <Spinner className="h-6 w-6 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            {description}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn('flex flex-col items-center justify-center', className)}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <EmptyState
        icon={icon || (variant === 'error' ? 'alert' : 'file')}
        title={title}
        description={description}
      />
      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {action && <ActionButton action={action} />}
          {secondaryAction && (
            <ActionButton
              action={{ ...secondaryAction, variant: 'outline' }}
            />
          )}
        </div>
      )}
    </div>
  )
}
