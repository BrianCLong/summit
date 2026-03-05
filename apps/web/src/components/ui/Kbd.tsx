import * as React from 'react'
import { cn } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * The text content of the key (e.g., "⌘", "Shift", "K").
   */
  children: React.ReactNode
}

/**
 * Standardized keyboard shortcut hint component.
 * Follows the platform-aware design pattern for accessibility and visual consistency.
 */
export function Kbd({ children, className, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        'pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:inline-flex',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
