import * as React from 'react'
import { cn, MODIFIER_KEY, SHIFT_KEY } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Automatically replaces 'mod' with ⌘ or Ctrl and 'shift' with ⇧ or Shift
   * based on the platform.
   */
  children: React.ReactNode
}

/**
 * Standardized keyboard shortcut hint component.
 * Follows accessibility guidelines for the <kbd> element.
 */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    const processChild = (child: React.ReactNode): React.ReactNode => {
      if (typeof child === 'string') {
        const lowerChild = child.toLowerCase()
        if (lowerChild === 'mod' || lowerChild === 'command' || lowerChild === 'ctrl') {
          return MODIFIER_KEY
        }
        if (lowerChild === 'shift') {
          return SHIFT_KEY
        }
        return child
      }
      return child
    }

    const processedChildren = React.Children.map(children, processChild)

    return (
      <kbd
        ref={ref}
        className={cn(
          'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
          className
        )}
        {...props}
      >
        {processedChildren}
      </kbd>
    )
  }
)

Kbd.displayName = 'Kbd'

export { Kbd }
