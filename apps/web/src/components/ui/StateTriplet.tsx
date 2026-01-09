import * as React from 'react'
import { AlertCircle, FileX, Loader2, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

type StateIcon = 'search' | 'file' | 'alert' | 'plus' | React.ReactNode

interface StateAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost'
}

interface StateTripletProps {
  status: 'loading' | 'error' | 'empty'
  title: string
  description?: string
  icon?: StateIcon
  actions?: StateAction[]
  loadingMessage?: string
  className?: string
}

const iconMap = {
  search: Search,
  file: FileX,
  alert: AlertCircle,
  plus: Plus,
}

export function StateTriplet({
  status,
  title,
  description,
  icon = 'file',
  actions = [],
  loadingMessage = 'Loading…',
  className,
}: StateTripletProps) {
  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex flex-col items-center justify-center gap-3 p-8 text-center',
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  const IconComponent = typeof icon === 'string' ? iconMap[icon] : null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        {IconComponent ? (
          <IconComponent className="h-8 w-8 text-muted-foreground" />
        ) : (
          icon
        )}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions.map(action => (
            <Button
              key={action.label}
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
