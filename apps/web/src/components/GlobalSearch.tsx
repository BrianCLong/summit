import React, { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { Search, FileText, User, AlertTriangle, Zap, Loader2, X } from 'lucide-react'
import { useSearch } from '@/contexts/SearchContext'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { useDemoMode } from '@/components/common/DemoIndicator'

interface SearchResult {
  id: string
  type: 'entity' | 'investigation' | 'alert' | 'case' | 'command'
  title: string
  description?: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string
}

export function GlobalSearch() {
  const { isOpen, query, setQuery, closeSearch } = useSearch()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const isDemoMode = useDemoMode()

  // Mock search function
  const searchFunction = async (query: string): Promise<SearchResult[]> => {
    if (!query || !query.trim()) return []

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))

    if (!isDemoMode) {
      return []
    }

    const mockResults: SearchResult[] = [
      // Entities
      {
        id: 'ent-001',
        type: 'entity',
        title: 'John Anderson',
        description: 'PERSON • Senior Engineer • 95% confidence',
        href: '/explore?entity=ent-001',
        icon: User,
        badge: 'PERSON',
      },
      {
        id: 'ent-002',
        type: 'entity',
        title: '192.168.1.100',
        description: 'IP_ADDRESS • Internal network • 98% confidence',
        href: '/explore?entity=ent-002',
        icon: Zap,
        badge: 'IP',
      },
      // Investigations
      {
        id: 'inv-001',
        type: 'investigation',
        title: 'Network Security Analysis',
        description: 'Active • 12 entities • High priority',
        href: '/explore?investigation=inv-001',
        icon: Search,
        badge: 'ACTIVE',
      },
      // Alerts
      {
        id: 'alert-001',
        type: 'alert',
        title: 'Suspicious Login Activity',
        description: 'Medium severity • Investigating',
        href: '/alerts/alert-001',
        icon: AlertTriangle,
        badge: 'MEDIUM',
      },
      // Cases
      {
        id: 'case-001',
        type: 'case',
        title: 'Insider Threat Investigation',
        description: 'In Progress • High priority',
        href: '/cases/case-001',
        icon: FileText,
        badge: 'HIGH',
      },
      // Commands
      {
        id: 'cmd-explore',
        type: 'command',
        title: 'Go to Graph Explorer',
        description: 'Navigate to the graph exploration interface',
        href: '/explore',
        icon: Search,
      },
      {
        id: 'cmd-alerts',
        type: 'command',
        title: 'View Alerts',
        description: 'Navigate to alerts dashboard',
        href: '/alerts',
        icon: AlertTriangle,
      },
    ]

    // Filter results based on query
    return mockResults.filter(
      result =>
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase())
    )
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isOpen) {
          closeSearch()
        } else {
          // Open search logic is handled in context or parent usually,
          // but if this component is conditionally rendered, this listener might need to be global.
          // Assuming useSearch handles the toggle, or this component is always mounted but hidden.
          // If isOpen is false, this component returns null, so this listener might not be active
          // unless it's attached in a parent or this component is always mounted with `display: none`.
          // For now, we assume this component is mounted but hidden or the key listener is global.
          // IF this component is unmounted when closed, this listener won't work to OPEN it.
          // However, standard `cmdk` pattern often wraps the whole app or is mounted at root.
          // Let's assume the context handles opening.
        }
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen, closeSearch])

  useEffect(() => {
    if (!query || !query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timeoutId = setTimeout(() => {
      searchFunction(query)
        .then(setResults)
        .finally(() => setLoading(false))
    }, 300) // Debounce already in searchFunction? No, searchFunction has delay, but we need debounce here to avoid calling it too often.

    return () => clearTimeout(timeoutId)
  }, [query, isDemoMode])

  const handleSelect = (result: SearchResult) => {
    if (result.href) {
      navigate(result.href)
      closeSearch()
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entity':
        return User
      case 'investigation':
        return Search
      case 'alert':
        return AlertTriangle
      case 'case':
        return FileText
      case 'command':
        return Zap
      default:
        return Search
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'entity':
        return 'secondary'
      case 'investigation':
        return 'default'
      case 'alert':
        return 'destructive'
      case 'case':
        return 'outline'
      case 'command':
        return 'intel'
      default:
        return 'secondary'
    }
  }

  if (!isOpen) {return null}

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={closeSearch}>
      <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <Command className="rounded-xl border shadow-md bg-popover overflow-hidden" loop>
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search entities, investigations, alerts..."
              value={query}
              onValueChange={setQuery}
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
              aria-label="Global search"
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
               <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">Esc</span>
                </kbd>
            </div>
          </div>

          <Command.List className="max-h-[500px] overflow-y-auto p-2 scroll-py-2">
            {!isDemoMode && (
              <div className="py-3 text-center text-xs text-muted-foreground">
                Live search is unavailable until a backend connection is configured.
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2 opacity-50" />
                <span>Searching...</span>
              </div>
            )}

            {!loading && query && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-20" />
                <p>No results found for "{query}"</p>
                <p className="text-xs mt-1 opacity-70">Try adjusting your search terms</p>
              </div>
            )}

            {!query && !loading && (
               <div className="py-6 px-4">
                 <p className="text-xs font-medium text-muted-foreground mb-2">SUGGESTED SEARCHES</p>
                 <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setQuery("John")}>John</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setQuery("Network")}>Network</Badge>
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setQuery("Suspicious")}>Suspicious</Badge>
                 </div>
               </div>
            )}

            {results.length > 0 && (
              <>
                {/* Group results by type */}
                {['command', 'entity', 'investigation', 'alert', 'case'].map(
                  type => {
                    const typeResults = results.filter(r => r.type === type)
                    if (typeResults.length === 0) {return null}

                    return (
                      <Command.Group
                        key={type}
                        heading={type.charAt(0).toUpperCase() + type.slice(1)}
                        className="text-xs font-medium text-muted-foreground px-2 py-1.5"
                      >
                        {typeResults.map(result => {
                          const Icon = result.icon || getTypeIcon(result.type)
                          return (
                            <Command.Item
                              key={result.id}
                              value={`${result.title} ${result.description}`}
                              onSelect={() => handleSelect(result)}
                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                            >
                              <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {result.title}
                                </div>
                                {result.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {result.description}
                                  </div>
                                )}
                              </div>
                              {result.badge && (
                                <Badge
                                  variant={
                                    getTypeBadgeVariant(result.type) as any
                                  }
                                  className="ml-2 text-[10px] h-5"
                                >
                                  {result.badge}
                                </Badge>
                              )}
                            </Command.Item>
                          )
                        })}
                      </Command.Group>
                    )
                  }
                )}
              </>
            )}
          </Command.List>

          <div className="border-t bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                 <span><kbd className="font-sans font-semibold">↵</kbd> Select</span>
                 <span><kbd className="font-sans font-semibold">↑↓</kbd> Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Search powered by IntelGraph</span>
              </div>
            </div>
          </div>
        </Command>
      </div>
    </div>
  )
}
