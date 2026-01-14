import React, { useState, useEffect, useCallback } from 'react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import {
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  ChevronRight,
  AlertTriangle,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import config from '@/config'

interface ProvenanceItem {
  id: string
  type: string
  createdAt: string
  actor?: string
  source?: string
  commit?: string
  status: 'success' | 'failed' | 'pending' | 'unknown'
  integrity: {
    hash?: string
    verified?: boolean
    signatureValid?: boolean
  }
  links: {
    runId?: string
    buildId?: string
    deploymentId?: string
    sessionId?: string
  }
  metadata?: Record<string, any>
}

interface ProvenanceDetails extends ProvenanceItem {
  inputs: Array<{ id: string; type: string; hash?: string; source?: string }>
  outputs: Array<{ id: string; type: string; hash?: string; destination?: string }>
  steps: Array<{
    id: string
    name: string
    status: string
    startedAt: string
    endedAt?: string
    duration?: number
  }>
  hashes: {
    contentHash?: string
    receiptHash?: string
    bundleHash?: string
  }
  signatures?: Array<{
    algorithm: string
    value: string
    timestamp: string
    signer: string
  }>
  policyDecisions?: Array<{
    policy: string
    decision: 'allow' | 'deny' | 'review'
    reason: string
    timestamp: string
  }>
  relatedIds: string[]
}

interface FilterState {
  query: string
  status: string
  from: string
  to: string
}

export default function ProvenanceExplorerPage() {
  const { enabled: featureEnabled, isLoading: flagLoading } = useFeatureFlag('ops.provenanceExplorer')

  const [items, setItems] = useState<ProvenanceItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ProvenanceDetails | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    status: '',
    from: '',
    to: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load cached data on mount if offline
  useEffect(() => {
    if (isOffline) {
      const cached = localStorage.getItem('provenance-cache')
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          setItems(data)
          setLastFetchTime(new Date(timestamp))
        } catch (e) {
          console.error('Failed to load cached data', e)
        }
      }
    }
  }, [isOffline])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (filters.query) queryParams.append('q', filters.query)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.from) queryParams.append('from', filters.from)
      if (filters.to) queryParams.append('to', filters.to)
      queryParams.append('limit', '50')

      const endpoint = filters.query || filters.status || filters.from || filters.to
        ? `/api/ops/provenance/search?${queryParams}`
        : `/api/ops/provenance/summary?${queryParams}`

      const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setItems(result.data || [])
        const now = new Date()
        setLastFetchTime(now)

        // Cache data
        localStorage.setItem(
          'provenance-cache',
          JSON.stringify({ data: result.data, timestamp: now.toISOString() })
        )
      } else {
        throw new Error(result.error || 'Failed to load provenance data')
      }
    } catch (err: any) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to load provenance data')

      // Try to load from cache on error
      const cached = localStorage.getItem('provenance-cache')
      if (cached && items.length === 0) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          setItems(data)
          setLastFetchTime(new Date(timestamp))
        } catch (e) {
          // Ignore cache load errors
        }
      }
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (!isOffline) {
      fetchItems()
    }
  }, [fetchItems, isOffline])

  const fetchItemDetails = async (id: string) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/ops/provenance/item/${id}`, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to load item details')
      }

      const result = await response.json()
      if (result.success) {
        setSelectedItem(result.data)
      }
    } catch (err: any) {
      console.error('Failed to load details:', err)
      setError('Failed to load item details')
    }
  }

  const handleExportEvidencePack = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one item to export')
      return
    }

    setExportLoading(true)
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/ops/provenance/evidence-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          format: 'download',
        }),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `evidence-pack-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSelectedIds(new Set())
    } catch (err: any) {
      console.error('Export error:', err)
      setError('Failed to export evidence pack')
    } finally {
      setExportLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedIds(newSelection)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'success':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'pending':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (flagLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!featureEnabled) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Provenance Explorer is not enabled. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Provenance Explorer</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inspect build and runtime provenance, evidence packs, and audit trails
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastFetchTime && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastFetchTime.toLocaleTimeString()}
              </span>
            )}
            {isOffline && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            {lastFetchTime && isOffline && (
              <Badge variant="secondary">
                Showing cached data
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchItems()}
              disabled={loading || isOffline}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by run ID, build, agent, session, or commit..."
                className="w-full rounded-md border pl-10 pr-4 py-2"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button onClick={() => fetchItems()} disabled={loading || isOffline}>
              Search
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-3 gap-3 rounded-md border p-3">
              <div>
                <label className="text-xs font-medium">Status</label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">From Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">To Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border px-3 py-2"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null)
                  fetchItems()
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Results Table */}
        <div className="flex-1 overflow-auto p-6">
          {selectedIds.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-md border bg-muted p-3">
              <span className="text-sm font-medium">
                {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleExportEvidencePack}
                  disabled={exportLoading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Evidence Pack
                </Button>
              </div>
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-sm text-muted-foreground">Loading provenance data...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No provenance found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isOffline
                    ? 'You are offline and no cached data is available.'
                    : 'Try adjusting your search filters or check back later.'}
                </p>
                {!isOffline && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchItems()}>
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="w-12 p-3">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && items.every((item) => selectedIds.has(item.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(items.map((item) => item.id)))
                          } else {
                            setSelectedIds(new Set())
                          }
                        }}
                      />
                    </th>
                    <th className="p-3 text-left text-sm font-medium">Created</th>
                    <th className="p-3 text-left text-sm font-medium">Type</th>
                    <th className="p-3 text-left text-sm font-medium">Actor</th>
                    <th className="p-3 text-left text-sm font-medium">Source/Commit</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Integrity</th>
                    <th className="w-12 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => fetchItemDetails(item.id)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                        />
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{item.type}</Badge>
                      </td>
                      <td className="p-3 text-sm">{item.actor || '-'}</td>
                      <td className="p-3 text-sm font-mono text-xs">
                        {item.source || item.commit || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3">
                        {item.integrity.verified ? (
                          <Badge variant="default" className="flex w-fit items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unknown</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Drawer */}
        {selectedItem && (
          <div className="w-96 border-l bg-muted/20 overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold">Provenance Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
                  ✕
                </Button>
              </div>

              {/* Metadata */}
              <div>
                <h3 className="text-sm font-medium mb-2">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <div className="font-mono text-xs">{selectedItem.id}</div>
                  </div>
                  {selectedItem.links.runId && (
                    <div>
                      <span className="text-muted-foreground">Run ID:</span>
                      <div className="font-mono text-xs">{selectedItem.links.runId}</div>
                    </div>
                  )}
                  {selectedItem.links.buildId && (
                    <div>
                      <span className="text-muted-foreground">Build ID:</span>
                      <div className="font-mono text-xs">{selectedItem.links.buildId}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Inputs/Outputs */}
              {selectedItem.inputs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Inputs</h3>
                  <div className="space-y-2">
                    {selectedItem.inputs.map((input) => (
                      <div key={input.id} className="rounded border p-2 text-xs">
                        <div className="font-medium">{input.type}</div>
                        {input.hash && (
                          <div className="font-mono text-muted-foreground">{input.hash.slice(0, 16)}...</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.outputs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Outputs</h3>
                  <div className="space-y-2">
                    {selectedItem.outputs.map((output) => (
                      <div key={output.id} className="rounded border p-2 text-xs">
                        <div className="font-medium">{output.type}</div>
                        {output.hash && (
                          <div className="font-mono text-muted-foreground">{output.hash.slice(0, 16)}...</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps Timeline */}
              {selectedItem.steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Steps</h3>
                  <div className="space-y-2">
                    {selectedItem.steps.map((step) => (
                      <div key={step.id} className="flex items-start gap-2 text-xs">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1">
                          <div className="font-medium">{step.name}</div>
                          <div className="text-muted-foreground">
                            {new Date(step.startedAt).toLocaleTimeString()}
                            {step.duration && ` (${Math.round(step.duration / 1000)}s)`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policy Decisions */}
              {selectedItem.policyDecisions && selectedItem.policyDecisions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Policy Decisions</h3>
                  <div className="space-y-2">
                    {selectedItem.policyDecisions.map((decision, idx) => (
                      <div key={idx} className="rounded border p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{decision.policy}</span>
                          <Badge
                            variant={
                              decision.decision === 'allow'
                                ? 'default'
                                : decision.decision === 'deny'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {decision.decision}
                          </Badge>
                        </div>
                        <div className="mt-1 text-muted-foreground">{decision.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashes */}
              {selectedItem.hashes.contentHash && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Hashes</h3>
                  <div className="rounded border p-2 font-mono text-xs break-all">
                    {selectedItem.hashes.contentHash}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
