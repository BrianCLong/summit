import * as React from 'react'
import { Search, X, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  showShortcut?: boolean
  shortcut?: string
  className?: string
  debounceTime?: number
}

export function SearchBar({
  placeholder = 'Search...',
  value = '',
  onChange,
  onClear,
  showShortcut = true,
  shortcut = '/',
  className,
  debounceTime = 300,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = React.useState(value)
  const onChangeRef = React.useRef(onChange)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Focus on shortcut using useEffect
  React.useEffect(() => {
    if (!shortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      let isMatch = false
      if (shortcut === '/') {
        if (e.key === '/') isMatch = true
      } else if (shortcut.toLowerCase().includes('meta') || shortcut.toLowerCase().includes('ctrl')) {
          // simple check for Cmd+K or Ctrl+K
          const key = shortcut.split('+').pop()?.toLowerCase()
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
             isMatch = true
          }
      } else if (e.key.toLowerCase() === shortcut.toLowerCase()) {
         isMatch = true
      }

      if (isMatch) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcut])

  // Keep the latest onChange reference
  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Use the ref to avoid resetting the timer if onChange changes identity
      if (internalValue !== value) {
        onChangeRef.current?.(internalValue)
      }
    }, debounceTime)

    return () => clearTimeout(timer)
  }, [internalValue, debounceTime, value]) // Removed onChange from dependencies

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
  }

  const handleClear = () => {
    setInternalValue('')
    onChangeRef.current?.('')
    onClear?.()
    inputRef.current?.focus()
  }

  const renderShortcut = () => {
    if (!shortcut) return null

    if (shortcut === '/') {
      return (
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">/</span>
        </kbd>
      )
    }

    if (shortcut.toLowerCase().includes('meta') || shortcut.toLowerCase().includes('ctrl')) {
      const key = shortcut.split('+').pop()?.toUpperCase() || 'K'
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Command className="h-3 w-3" />
          <span>{key}</span>
        </div>
      )
    }

    return (
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
        <span className="text-xs">{shortcut.toUpperCase()}</span>
      </kbd>
    )
  }

  return (
    <div
      className={cn('relative flex items-center w-full max-w-md', className)}
    >
      <div className="relative w-full">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          aria-label={placeholder || 'Search'}
          value={internalValue}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {internalValue && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </button>
          )}
          {showShortcut && !internalValue && renderShortcut()}
        </div>
      </div>
    </div>
  )
}
