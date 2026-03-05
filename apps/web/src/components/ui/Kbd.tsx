import * as React from 'react'
import { cn, MODIFIER_KEY, SHIFT_KEY } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * The keyboard shortcut to display.
   * Special values: 'mod', 'command', 'ctrl', 'shift' will be automatically
   * transformed to platform-aware symbols or strings.
   */
  children: string
}

/**
 * Standardized keyboard shortcut hint component.
 * Uses semantic <kbd> element with platform-aware modifier transformations.
 */
export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, ...props }, ref) => {
    const keys = children.split('+').map((key) => {
      const trimmedKey = key.trim().toLowerCase()
      if (trimmedKey === 'mod' || trimmedKey === 'command' || trimmedKey === 'ctrl') {
        return MODIFIER_KEY
      }
      if (trimmedKey === 'shift') {
        return SHIFT_KEY
      }
      return key.trim()
    })

    return (
      <kbd
        ref={ref}
        className={cn(
          'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
          className
        )}
        {...props}
      >
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span>+</span>}
            <span className={key.length > 1 ? 'text-[9px]' : 'text-xs'}>
              {key}
            </span>
          </React.Fragment>
        ))}
      </kbd>
    )
  }
)

Kbd.displayName = 'Kbd'
