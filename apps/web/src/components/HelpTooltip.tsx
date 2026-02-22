import React from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover'
import { Button } from '@/components/ui/Button'

interface HelpTooltipProps {
  content: React.ReactNode
  trigger?: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

export function HelpTooltip({
  content,
  trigger,
  side = 'top',
  className,
}: HelpTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className={className}>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Help</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent side={side} className="w-80 text-sm">
        {content}
      </PopoverContent>
    </Popover>
  )
}
