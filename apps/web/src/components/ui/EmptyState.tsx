import * as React from 'react'
import { AlertCircle, FileX, Search, Plus, BarChart3, RefreshCw, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { useNavigate } from 'react-router-dom'

interface EmptyStateProps {
  icon?: 'search' | 'file' | 'alert' | 'plus' | 'chart' | React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }
  /**
   * Optional retry action for error scenarios
   */
  onRetry?: () => void
  /**
   * Show a "Go Home" button for navigation safety
   */
  showHomeButton?: boolean
  className?: string
}

const iconMap = {
  search: Search,
  file: FileX,
  alert: AlertCircle,
  plus: Plus,
  chart: BarChart3,
}

export function EmptyState({
  icon = 'file',
  title,
  description,
  action,
  onRetry,
  showHomeButton = false,
  className,
}: EmptyStateProps) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon] : null
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        {IconComponent ? (
          <IconComponent className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
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
      <div className="flex gap-3">
        {action && (
          <Button onClick={action.onClick} variant={action.variant || 'default'}>
            {action.label}
          </Button>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
        {showHomeButton && (
          <Button onClick={() => navigate('/')} variant="outline">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        )}
      </div>
    </div>
  )
}
