import * as React from 'react'
import {
  AlertCircle,
  FileX,
  Search,
  Plus,
  BarChart3,
  FolderOpen,
  Database,
  Settings,
  LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface QuickAction {
  label: string
  onClick: () => void
  icon?: LucideIcon
  id?: string
}

interface EmptyStateProps {
  icon?: 'search' | 'file' | 'alert' | 'plus' | 'chart' | 'folder' | 'database' | 'settings' | React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }
  quickActions?: QuickAction[]
  className?: string
}

const iconMap = {
  search: Search,
  file: FileX,
  alert: AlertCircle,
  plus: Plus,
  chart: BarChart3,
  folder: FolderOpen,
  database: Database,
  settings: Settings,
}

export function EmptyState({
  icon = 'file',
  title,
  description,
  action,
  quickActions,
  className,
}: EmptyStateProps) {
  const IconComponent = typeof icon === 'string' ? iconMap[icon] : null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
      role="region"
      aria-label="Empty state"
    >
      <div className="mb-4 rounded-full bg-muted p-4" aria-hidden="true">
        {IconComponent ? (
          <IconComponent className="h-8 w-8 text-muted-foreground" />
        ) : (
          icon
        )}
      </div>
      <h3 className="mb-2 text-lg font-semibold" id="empty-state-title">
        {title}
      </h3>
      {description && (
        <p className="mb-4 text-sm text-muted-foreground max-w-sm" id="empty-state-description">
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
          aria-describedby={description ? 'empty-state-description' : undefined}
        >
          {action.label}
        </Button>
      )}
      {quickActions && quickActions.length > 0 && (
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
          role="group"
          aria-label="Quick actions"
        >
          {quickActions.map((quickAction, index) => {
            const QuickActionIcon = quickAction.icon
            const actionId = quickAction.id || `quick-action-${index}`

            return (
              <Button
                key={actionId}
                variant="outline"
                size="sm"
                onClick={quickAction.onClick}
                className="gap-2"
                aria-label={quickAction.label}
              >
                {QuickActionIcon && <QuickActionIcon className="h-4 w-4" aria-hidden="true" />}
                {quickAction.label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
