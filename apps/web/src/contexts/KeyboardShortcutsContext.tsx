// =============================================
// Keyboard Shortcuts Context
// =============================================
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

// Define the shape of a shortcut
export interface Shortcut {
  id: string
  keys: string[]
  description: string
  category: 'Navigation' | 'Actions' | 'View' | 'Debug'
  action: () => void
  disabled?: boolean
}

interface KeyboardShortcutsContextType {
  registerShortcut: (shortcut: Omit<Shortcut, 'action'> & { action?: () => void }) => void
  unregisterShortcut: (id: string) => void
  openHelp: () => void
  closeHelp: () => void
  isHelpOpen: boolean
  shortcuts: Shortcut[]
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined)

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider')
  }
  return context
}

// Hook for registering a shortcut in a component
export function useShortcut(
  keys: string | string[],
  callback: () => void,
  options: {
    id: string
    description: string
    category?: Shortcut['category']
    enabled?: boolean
    preventDefault?: boolean
  }
) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts()

  // Register with the global list (for the help dialog)
  React.useEffect(() => {
    if (options.enabled === false) return

    const keyArray = Array.isArray(keys) ? keys : [keys]

    registerShortcut({
      id: options.id,
      keys: keyArray,
      description: options.description,
      category: options.category || 'Actions',
    })

    return () => {
      unregisterShortcut(options.id)
    }
  }, [options.id, options.description, options.category, options.enabled, keys, registerShortcut, unregisterShortcut])

  // Bind the hotkey
  useHotkeys(keys, (e) => {
    if (options.preventDefault !== false) {
      e.preventDefault()
    }
    callback()
  }, { enabled: options.enabled !== false })
}

interface KeyboardShortcutsProviderProps {
  children: ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const registerShortcut = useCallback((shortcut: Omit<Shortcut, 'action'>) => {
    setShortcuts(prev => {
      // Avoid duplicates
      if (prev.some(s => s.id === shortcut.id)) {
        return prev.map(s => s.id === shortcut.id ? { ...s, ...shortcut, action: () => {} } : s)
      }
      return [...prev, { ...shortcut, action: () => {} }]
    })
  }, [])

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id))
  }, [])

  const openHelp = useCallback(() => setIsHelpOpen(true), [])
  const closeHelp = useCallback(() => setIsHelpOpen(false), [])

  // Register global shortcuts
  useHotkeys('shift+?', (e) => {
    e.preventDefault()
    setIsHelpOpen(prev => !prev)
  })

  useHotkeys('esc', () => {
    if (isHelpOpen) setIsHelpOpen(false)
  })

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        registerShortcut,
        unregisterShortcut,
        openHelp,
        closeHelp,
        isHelpOpen,
        shortcuts
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}
