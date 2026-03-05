import * as React from 'react'
import { cn, isMac } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  keys?: string | string[]
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, keys, children, ...props }, ref) => {
    const keyList = React.useMemo(() => {
      if (children) return null
      if (!keys) return []
      return Array.isArray(keys) ? keys : [keys]
    }, [keys, children])

    const renderKey = (key: string) => {
      const normalizedKey = key.toLowerCase()

      if (
        normalizedKey === 'mod' ||
        normalizedKey === 'command' ||
        normalizedKey === 'cmd' ||
        normalizedKey === 'ctrl' ||
        normalizedKey === 'control'
      ) {
        return isMac ? '⌘' : 'Ctrl'
      }

      if (normalizedKey === 'shift') {
        return isMac ? '⇧' : 'Shift'
      }

      if (normalizedKey === 'alt' || normalizedKey === 'option') {
        return isMac ? '⌥' : 'Alt'
      }

      if (normalizedKey === 'enter') return '↵'
      if (normalizedKey === 'delete') return '⌫'
      if (normalizedKey === 'escape' || normalizedKey === 'esc') return 'Esc'

      return key
    }

    return (
      <kbd
        ref={ref}
        className={cn(
          'pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:inline-flex',
          className
        )}
        {...props}
      >
        {children || (
          <>
            {keyList?.map((key, index) => (
              <React.Fragment key={index}>
                {renderKey(key)}
                {index < keyList.length - 1 && <span className="opacity-50">+</span>}
              </React.Fragment>
            ))}
          </>
        )}
      </kbd>
    )
  }
)

Kbd.displayName = 'Kbd'

export { Kbd }
