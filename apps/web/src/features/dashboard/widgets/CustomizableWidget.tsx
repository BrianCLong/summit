import React from 'react'
import { cn } from '@/lib/utils'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface CustomizableWidgetProps {
  title: string
  children: React.ReactNode
  className?: string
  isExpanded?: boolean
  onToggleExpand?: () => void
  onClose?: () => void
}

export function CustomizableWidget({
  title,
  children,
  className,
  isExpanded,
  onToggleExpand,
  onClose,
}: CustomizableWidgetProps) {
  return (
    <Card
      className={cn(
        'flex flex-col h-full overflow-hidden transition-all',
        className,
        isExpanded && 'fixed inset-4 z-50 shadow-2xl h-auto'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b bg-card shrink-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1">
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-auto relative">
        {children}
      </CardContent>
    </Card>
  )
}
