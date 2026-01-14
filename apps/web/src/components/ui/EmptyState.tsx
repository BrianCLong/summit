import * as React from 'react'
import {
  Activity,
  AlertCircle,
  BarChart3,
  FileX,
  FolderOpen,
  Plus,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

type EmptyStateIcon =
  | 'search'
  | 'file'
  | 'alert'
  | 'plus'
  | 'chart'
  | 'folder'
  | 'activity'
  | React.ReactNode

interface QuickAction {
  id: string
  label: string
  onClick: () => void
  icon?: React.ElementType | React.ReactNode
  ariaLabel?: string
  variant?: 'default' | 'outline' | 'ghost'
}

interface EmptyStateProps {
  icon?: EmptyStateIcon
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
  activity: Activity,
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
  const titleId = React.useId()
  const descriptionId = React.useId()

  const renderQuickActionIcon = (iconNode?: QuickAction['icon']) => {
    if (!iconNode) {
      return null
    }
    if (React.isValidElement(iconNode)) {
      return (
        <span aria-hidden="true" className="flex h-4 w-4 items-center">
          {iconNode}
        </span>
      )
    }
    const Icon = iconNode as React.ElementType
    return <Icon className="h-4 w-4" aria-hidden="true" />
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
      role="region"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        {IconComponent ? (
          <IconComponent className="h-8 w-8 text-muted-foreground" />
        ) : (
          icon
        )}
      </div>
      <h3 id={titleId} className="mb-2 text-lg font-semibold">
        {title}
      </h3>
      {description && (
        <p
          id={descriptionId}
          className="mb-4 text-sm text-muted-foreground max-w-sm"
        >
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant={action.variant || 'default'}>
          {action.label}
        </Button>
      )}
      {quickActions && quickActions.length > 0 && (
        <div
          className={cn(
            'mt-4 flex flex-wrap items-center justify-center gap-2',
            action ? 'pt-2' : undefined
          )}
          role="group"
          aria-label="Quick actions"
        >
          {quickActions.map(quickAction => (
            <Button
              key={quickAction.id}
              size="sm"
              variant={quickAction.variant ?? 'outline'}
              onClick={quickAction.onClick}
              className="gap-2"
              aria-label={quickAction.ariaLabel ?? quickAction.label}
            >
              {renderQuickActionIcon(quickAction.icon)}
              <span>{quickAction.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
