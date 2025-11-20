// =============================================
// Keyboard Shortcuts Hook for A11y
// =============================================
import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  callback: (event: KeyboardEvent) => void
  description?: string
}

/**
 * Hook to register keyboard shortcuts
 * @param shortcuts Array of keyboard shortcut configurations
 * @param enabled Whether the shortcuts should be active (default: true)
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when user is typing in an input
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const {
          key,
          ctrlKey = false,
          shiftKey = false,
          altKey = false,
          metaKey = false,
          callback,
        } = shortcut

        const matchesKey = event.key.toLowerCase() === key.toLowerCase()
        const matchesCtrl = ctrlKey === event.ctrlKey
        const matchesShift = shiftKey === event.shiftKey
        const matchesAlt = altKey === event.altKey
        const matchesMeta = metaKey === event.metaKey

        if (
          matchesKey &&
          matchesCtrl &&
          matchesShift &&
          matchesAlt &&
          matchesMeta
        ) {
          event.preventDefault()
          callback(event)
          break
        }
      }
    },
    [shortcuts, enabled]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

/**
 * Get a human-readable representation of a keyboard shortcut
 * @param shortcut Keyboard shortcut configuration
 * @returns String representation (e.g., "Ctrl+Shift+K")
 */
export function getShortcutLabel(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.metaKey) parts.push('⌘')
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  parts.push(shortcut.key.toUpperCase())

  return parts.join('+')
}
