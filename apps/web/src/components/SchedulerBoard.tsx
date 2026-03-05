import React, { useEffect, useState, useMemo } from 'react'

interface QueueItem {
  id: string
  tenant: string
  eta: string
  pool: string
  cost: number
  preemptSuggestion: boolean
}

interface AutoscaleHints {
  minuteAhead?: number
}

export default function SchedulerBoard() {
  const [q, setQ] = useState<QueueItem[]>([])
  const [hints, setHints] = useState<AutoscaleHints>({})
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const s = new EventSource('/api/queue/stream')
    s.onmessage = e => setQ(JSON.parse(e.data))
    return () => s.close()
  }, [])

  useEffect(() => {
    fetch('/api/autoscale/hints')
      .then(r => r.json())
      .then(setHints)
  }, [])

  const filteredQ = useMemo(() => {
    const lowerFilter = filter.toLowerCase()
    if (!lowerFilter) return q
    return q.filter(r => {
      // Create a string representation of the row content to match jQuery .text() behavior
      const rowText = [
        r.id,
        r.tenant,
        r.eta,
        r.pool,
        `$${r.cost.toFixed(2)}`,
        r.preemptSuggestion ? '✅' : '—'
      ].join('').toLowerCase()
      return rowText.includes(lowerFilter)
    })
  }, [q, filter])

  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Scheduler Board</h3>
        <input
          id="tenantFilter"
          className="border rounded px-2 py-1"
          placeholder="filter tenant…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="ml-auto text-sm">
          Predicted queue next min: <b>{hints.minuteAhead ?? '-'}</b>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Run</th>
            <th>Tenant</th>
            <th>ETA</th>
            <th>Pool</th>
            <th>Cost est.</th>
            <th>Preempt?</th>
          </tr>
        </thead>
        <tbody>
          {filteredQ.map((r: QueueItem) => (
            <tr key={r.id} className="row border-b">
              <td>{r.id}</td>
              <td>{r.tenant}</td>
              <td>{r.eta}</td>
              <td>{r.pool}</td>
              <td>${r.cost.toFixed(2)}</td>
              <td>{r.preemptSuggestion ? '✅' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
