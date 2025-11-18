/**
 * Unified Search Component
 * Sprint 27G: Tri-pane UX with advanced search and error-proofing
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Clock,
  Star,
  Zap,
  Mic,
  FileText,
  User,
  MessageSquare,
  Lightbulb,
  HelpCircle,
} from 'lucide-react'
// ... (rest of the file)
const getTypeIcon = (type: string) => {
  const icons = {
    entity: <Search className="h-4 w-4" />,
    document: <FileText className="h-4 w-4" />,
    user: <User className="h-4 w-4" />,
    conversation: <MessageSquare className="h-4 w-4" />,
    insight: <Lightbulb className="h-4 w-4" />,
  }
  return icons[type] || <HelpCircle className="h-4 w-4" />
}
// ... (rest of the file)
;<Mic className="h-4 w-4" />
import debounce from 'lodash/debounce'
import DOMPurify from 'dompurify'

interface SearchResult {
  id: string
  type: 'entity' | 'document' | 'user' | 'conversation' | 'insight'
  title: string
  description: string
  highlights: string[]
  score: number
  metadata: {
    createdAt: string
    updatedAt: string
    author?: string
    tags?: string[]
    category?: string
  }
  actions: SearchAction[]
}

interface SearchAction {
  id: string
  label: string
  icon: React.ComponentType
  handler: (result: SearchResult) => void
  shortcut?: string
}

interface SearchFilter {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'date' | 'range'
  options?: { value: string; label: string }[]
  value: any
}

interface UnifiedSearchProps {
  onResultSelect: (result: SearchResult) => void
  onFilterChange: (filters: Record<string, any>) => void
  className?: string
  placeholder?: string
  maxResults?: number
  enableVoiceSearch?: boolean
  enableAdvancedFilters?: boolean
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  onResultSelect,
  onFilterChange,
  className = '',
  placeholder = 'Search everything...',
  maxResults = 10,
  enableVoiceSearch = true,
  enableAdvancedFilters = true,
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isVoiceActive, setIsVoiceActive] = useState(false)

  // Search filters configuration
  const availableFilters: SearchFilter[] = [
    {
      id: 'type',
      label: 'Content Type',
      type: 'multiselect',
      options: [
        { value: 'entity', label: 'Entities' },
        { value: 'document', label: 'Documents' },
        { value: 'user', label: 'People' },
        { value: 'conversation', label: 'Conversations' },
        { value: 'insight', label: 'Insights' },
      ],
      value: [],
    },
    {
      id: 'dateRange',
      label: 'Date Range',
      type: 'select',
      options: [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'quarter', label: 'This Quarter' },
        { value: 'year', label: 'This Year' },
      ],
      value: '',
    },
    {
      id: 'author',
      label: 'Author',
      type: 'select',
      options: [], // Would be populated from API
      value: '',
    },
    {
      id: 'tags',
      label: 'Tags',
      type: 'multiselect',
      options: [], // Would be populated from API
      value: [],
    },
  ]

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(
      async (searchQuery: string, searchFilters: Record<string, any>) => {
        if (!searchQuery.trim()) {
          setResults([])
          setIsLoading(false)
          return
        }

        setIsLoading(true)
        try {
          const searchResults = await performSearch(searchQuery, searchFilters)
          setResults(searchResults.slice(0, maxResults))
        } catch (error) {
          console.error('Search failed:', error)
          setResults([])
        } finally {
          setIsLoading(false)
        }
      },
      300
    ),
    [maxResults]
  )

  // Effect for search execution
  useEffect(() => {
    debouncedSearch(query, filters)
  }, [query, filters, debouncedSearch])

  // Mock search function (replace with actual API call)
  const performSearch = async (
    searchQuery: string,
    searchFilters: Record<string, any>
  ): Promise<SearchResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))

    // Mock search results
    return [
      {
        id: '1',
        type: 'entity' as const,
        title: 'Customer Analytics Dashboard',
        description:
          'Real-time analytics for customer behavior and engagement metrics',
        highlights: ['customer', 'analytics', 'dashboard'],
        score: 0.95,
        metadata: {
          createdAt: '2024-09-15T10:00:00Z',
          updatedAt: '2024-09-19T14:30:00Z',
          author: 'john.doe@company.com',
          tags: ['analytics', 'dashboard', 'customer'],
          category: 'Business Intelligence',
        },
        actions: [
          {
            id: 'open',
            label: 'Open',
            icon: Search,
            handler: result => onResultSelect(result),
            shortcut: '+O',
          },
          {
            id: 'star',
            label: 'Star',
            icon: Star,
            handler: result => console.log('Starred:', result.title),
          },
        ],
      },
      {
        id: '2',
        type: 'document' as const,
        title: 'Q3 Business Review',
        description:
          'Quarterly business performance review and strategic insights',
        highlights: ['business', 'review', 'Q3'],
        score: 0.87,
        metadata: {
          createdAt: '2024-09-01T09:00:00Z',
          updatedAt: '2024-09-18T16:45:00Z',
          author: 'jane.smith@company.com',
          tags: ['quarterly', 'business', 'strategy'],
          category: 'Reports',
        },
        actions: [
          {
            id: 'open',
            label: 'Open',
            icon: Search,
            handler: result => onResultSelect(result),
            shortcut: '+O',
          },
          {
            id: 'insights',
            label: 'Get Insights',
            icon: Zap,
            handler: result =>
              console.log('Getting insights for:', result.title),
          },
        ],
      },
    ].filter(result => {
      // Apply filters
      if (
        searchFilters.type?.length > 0 &&
        !searchFilters.type.includes(result.type)
      ) {
        return false
      }
      return true
    })
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          onResultSelect(results[selectedIndex])
          addToRecentSearches(query)
        }
        break
      case 'Escape':
        setQuery('')
        setResults([])
        setSelectedIndex(-1)
        break
    }
  }

  // Voice search functionality
  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => setIsVoiceActive(true)
      recognition.onend = () => setIsVoiceActive(false)

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
      }

      recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error)
        setIsVoiceActive(false)
      }

      recognition.start()
    } else {
      alert('Voice search is not supported in your browser')
    }
  }

  // Recent searches management
  const addToRecentSearches = (searchQuery: string) => {
    setRecentSearches(prev => {
      const updated = [
        searchQuery,
        ...prev.filter(s => s !== searchQuery),
      ].slice(0, 5)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
      return updated
    })
  }

  // Load recent searches on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches')
    if (stored) {
      setRecentSearches(JSON.parse(stored))
    }
  }, [])

  // Filter management
  const updateFilter = (filterId: string, value: any) => {
    const updatedFilters = { ...filters, [filterId]: value }
    setFilters(updatedFilters)
    onFilterChange(updatedFilters)
  }

  const clearFilters = () => {
    setFilters({})
    onFilterChange({})
  }

  // Result type icons
  const getTypeIcon = (type: string) => {
    const icons = {
      entity: '<',
      document: '=',
      user: '=d',
      conversation: '=',
      insight: '=',
    }
    return icons[type] || '='
  }

  // Highlight search terms
  const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
  }

  const highlightText = (text: string, highlights: string[]) => {
    let highlightedText = text
    highlights.forEach(highlight => {
      const escapedHighlight = escapeRegExp(highlight)
      const regex = new RegExp(`(${escapedHighlight})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
    })
    return { __html: DOMPurify.sanitize(highlightedText) }
  }

  return (
    <div className={`unified-search relative ${className}`}>
      {/* Search Input */}
      <div className="search-input relative">
        <div className="flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Voice Search Button */}
          {enableVoiceSearch && (
            <button
              onClick={startVoiceSearch}
              className={`absolute right-12 p-1 rounded ${isVoiceActive ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
              title="Voice Search"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}

          {/* Filter Toggle */}
          {enableAdvancedFilters && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-3 p-1 text-gray-400 hover:text-gray-600"
              title="Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                Recent Searches
              </div>
            </div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => setQuery(search)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
              >
                {search}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && enableAdvancedFilters && (
        <div className="filters mt-3 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableFilters.map(filter => (
              <div key={filter.id} className="filter-group">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {filter.label}
                </label>

                {filter.type === 'select' && (
                  <select
                    value={filters[filter.id] || ''}
                    onChange={e => updateFilter(filter.id, e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {filter.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'multiselect' && (
                  <div className="space-y-1">
                    {filter.options?.map(option => (
                      <label
                        key={option.value}
                        className="flex items-center text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={(filters[filter.id] || []).includes(
                            option.value
                          )}
                          onChange={e => {
                            const current = filters[filter.id] || []
                            const updated = e.target.checked
                              ? [...current, option.value]
                              : current.filter(v => v !== option.value)
                            updateFilter(filter.id, updated)
                          }}
                          className="mr-2 h-3 w-3"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {(results.length > 0 || isLoading) && (
        <div className="search-results absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching...
            </div>
          )}

          {!isLoading &&
            results.map((result, index) => (
              <div
                key={result.id}
                className={`result-item p-3 border-b border-gray-100 last:border-b-0 cursor-pointer ${
                  selectedIndex === index ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => onResultSelect(result)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-lg">{getTypeIcon(result.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className="text-sm font-medium text-gray-900 truncate"
                        dangerouslySetInnerHTML={highlightText(
                          result.title,
                          result.highlights
                        )}
                      />
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {result.type}
                      </span>
                    </div>

                    <p
                      className="text-xs text-gray-600 line-clamp-2"
                      dangerouslySetInnerHTML={highlightText(
                        result.description,
                        result.highlights
                      )}
                    />

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {result.metadata.author && (
                        <span>By {result.metadata.author}</span>
                      )}
                      <span>
                        {new Date(
                          result.metadata.updatedAt
                        ).toLocaleDateString()}
                      </span>
                      {result.metadata.tags && (
                        <div className="flex gap-1">
                          {result.metadata.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="bg-gray-100 px-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="text-xs text-gray-400">
                      {Math.round(result.score * 100)}%
                    </div>
                    {result.actions.map(action => (
                      <button
                        key={action.id}
                        onClick={e => {
                          e.stopPropagation()
                          action.handler(result)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
                      >
                        <action.icon className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

          {!isLoading && results.length === 0 && query && (
            <div className="p-4 text-center text-gray-500">
              <div className="text-4xl mb-2">=</div>
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
