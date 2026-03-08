import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

interface DisabledOverlayProps {
  message?: string
  className?: string
  children?: React.ReactNode
}

export function DisabledOverlay({
  message = "Upgrade to perform this action",
  className,
  children
}: DisabledOverlayProps) {
  // If children are provided, wrap them in a tooltip and make them look disabled
  if (children) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("relative inline-block cursor-not-allowed opacity-50", className)}>
              <div className="pointer-events-none">
                {children}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // If no children, show a standalone banner/overlay
  return (
    <div className={cn(
      "flex items-center justify-center p-4 bg-muted/50 border-2 border-dashed border-muted rounded-lg text-sm text-muted-foreground",
      className
    )}>
      <span>{message}</span>
    </div>
  )
}
