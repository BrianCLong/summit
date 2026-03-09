import * as React from 'react'
import { cn, MODIFIER_KEY, SHIFT_KEY } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Keyboard key(s) to display. Supports:
   * - Single string: `"K"` or composite `"mod+K"` (split on `+`, each token normalized)
   * - Array of strings via the `keys` prop
   * - React children (raw)
   *
   * Special tokens: 'mod'/'command'/'ctrl' → ⌘/Ctrl, 'shift' → ⇧
   */
  children?: React.ReactNode
  /**
   * Convenience prop: pass a string or array of strings for keyboard keys.
   * Each token is rendered as a separate span and normalized.
   */
  keys?: string | string[]
}

const normalizeKey = (key: string): string => {
  const lower = key.toLowerCase()
  if (lower === 'mod' || lower === 'command' || lower === 'ctrl') return MODIFIER_KEY
  if (lower === 'shift') return SHIFT_KEY
  return key
}

const renderTokens = (tokens: string[]): React.ReactNode =>
  tokens.map((t, i) => (
    <React.Fragment key={i}>
      {i > 0 && <span aria-hidden="true">+</span>}
      <span>{normalizeKey(t)}</span>
    </React.Fragment>
  ))

/**
 * Standardized keyboard shortcut hint component.
 * Follows accessibility guidelines for the <kbd> element.
 */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, children, keys, ...props }, ref) => {
    let content: React.ReactNode

    if (keys !== undefined) {
      const keyArray = Array.isArray(keys) ? keys : keys.split('+')
      content = renderTokens(keyArray)
    } else if (typeof children === 'string' && children.includes('+')) {
      // Composite string child like "mod+K" — split and normalize each token
      content = renderTokens(children.split('+'))
    } else {
      // Passthrough: children may be strings, nodes, or arrays
      content = React.Children.map(children, (child) => {
        if (typeof child !== 'string') return child
        return <span>{normalizeKey(child)}</span>
      })
    }

    return (
      <kbd
        ref={ref}
        className={cn(
          'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
          className
        )}
        {...props}
      >
        {content}
      </kbd>
    )
  }
)

Kbd.displayName = 'Kbd'

export { Kbd }
