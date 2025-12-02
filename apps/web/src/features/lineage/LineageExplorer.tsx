import { useEffect, useMemo, useState } from 'react'
import { fetchLineageGraph } from './api'
import { LineageGraph, LineageLink } from './types'

interface LineageExplorerProps {
  entityId: string
  initialGraph?: LineageGraph
}

function TagBadge({ tag }: { tag: string }) {
  const tagTone = useMemo(() => {
    if (tag.toLowerCase().includes('pii')) return 'bg-red-100 text-red-700 border-red-200'
    if (tag.toLowerCase().includes('warrant')) return 'bg-amber-100 text-amber-700 border-amber-200'
    if (tag.toLowerCase().includes('license')) return 'bg-blue-100 text-blue-700 border-blue-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }, [tag])

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tagTone}`}>
      {tag}
    </span>
  )
}

function LinkList({ title, links }: { title: string; links: LineageLink[] }) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-500">{links.length} items</span>
      </div>
      {links.length === 0 ? (
        <p className="text-sm text-slate-500">No linked nodes available.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="rounded-md border border-slate-100 bg-slate-50 p-3"
              aria-label={`${link.type} ${link.label}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{link.label}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{link.type}</p>
                </div>
                {link.restricted && (
                  <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                    Limited
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {link.tags.map((tag) => (
                  <TagBadge key={`${link.id}-${tag}`} tag={tag} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LineageExplorer({ entityId, initialGraph }: LineageExplorerProps) {
  const [graph, setGraph] = useState<LineageGraph | null>(initialGraph ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!initialGraph)

  useEffect(() => {
    let mounted = true
    if (initialGraph) return undefined

    setLoading(true)
    fetchLineageGraph(entityId)
      .then((data) => {
        if (mounted) {
          setGraph(data)
          setError(null)
        }
      })
      .catch(() => {
        if (mounted) setError('Unable to load lineage for this item')
      })
      .finally(() => mounted && setLoading(false))

    return () => {
      mounted = false
    }
  }, [entityId, initialGraph])

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
        {error}
      </div>
    )
  }

  if (loading || !graph) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading lineage…
      </div>
    )
  }

  return (
    <div className="space-y-4" aria-label="lineage-explorer">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Read-only</p>
          <h2 className="text-lg font-semibold text-slate-900">Lineage Explorer</h2>
          <p className="text-sm text-slate-600">Context for {graph.targetId}</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="policy-tags">
          {graph.policyTags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      </header>

      {graph.restricted && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {graph.restrictionReason || 'Lineage is partially redacted for this viewer.'}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <LinkList title="Upstream" links={graph.upstream} />
        <LinkList title="Downstream" links={graph.downstream} />
      </div>
    </div>
  )
}
