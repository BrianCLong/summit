import { useEffect, useState } from 'react'
import { fetchLineageGraph } from './api'
import { LineageGraph } from './types'

interface WhyAmISeeingThisProps {
  entityId: string
  contextLabel?: string
  initialGraph?: LineageGraph
  onViewDetails?: (graph: LineageGraph) => void
  className?: string
}

export function WhyAmISeeingThis({
  entityId,
  contextLabel,
  initialGraph,
  onViewDetails,
  className,
}: WhyAmISeeingThisProps) {
  const [graph, setGraph] = useState<LineageGraph | null>(initialGraph ?? null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (initialGraph) return undefined

    fetchLineageGraph(entityId)
      .then((data) => {
        if (mounted) {
          setGraph(data)
          setError(null)
        }
      })
      .catch(() => mounted && setError('Lineage unavailable for this item.'))

    return () => {
      mounted = false
    }
  }, [entityId, initialGraph])

  const handleViewDetails = () => {
    if (graph && onViewDetails) {
      onViewDetails(graph)
    }
  }

  if (error) {
    return (
      <div className={`rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 ${className ?? ''}`}>
        {error}
      </div>
    )
  }

  if (!graph) {
    return (
      <div className={`rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600 ${className ?? ''}`}>
        Loading lineage…
      </div>
    )
  }

  const upstreamSummary = graph.upstream
    .map((item) => `${item.label}${item.restricted ? ' (restricted)' : ''}`)
    .join(', ')

  const downstreamSummary = graph.downstream
    .map((item) => `${item.label}${item.restricted ? ' (restricted)' : ''}`)
    .join(', ')

  return (
    <div
      className={`rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 ${className ?? ''}`}
      aria-label="why-am-i-seeing-this"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Why am I seeing this?</p>
          <p className="text-xs text-slate-600">{contextLabel ?? 'Lineage context'}</p>
        </div>
        {graph.restricted && (
          <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">Limited</span>
        )}
      </div>

      {graph.restricted ? (
        <p className="mt-2 text-xs text-amber-800" role="status">
          {graph.restrictionReason || 'Some lineage paths are redacted for this viewer.'}
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-xs">
          <p data-testid="upstream-summary">Upstream: {upstreamSummary || 'None'}</p>
          <p data-testid="downstream-summary">Downstream: {downstreamSummary || 'None'}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2" aria-label="policy-tags-inline">
        {graph.policyTags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-800"
          >
            {tag}
          </span>
        ))}
      </div>

      {onViewDetails && (
        <button
          type="button"
          onClick={handleViewDetails}
          className="mt-3 inline-flex items-center rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
        >
          View lineage
        </button>
      )}
    </div>
  )
}
