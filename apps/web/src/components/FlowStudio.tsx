import React, { useEffect, useState } from 'react'
import $ from 'jquery'
type Node = { id: string; type: string; label: string }
export default function FlowStudio() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'b1', type: 'build', label: 'Build' },
    { id: 't1', type: 'test', label: 'Test' },
    { id: 'd1', type: 'deploy', label: 'Deploy' },
  ])
  const [edges, setEdges] = useState<{ from: string; to: string }[]>([
    { from: 'b1', to: 't1' },
    { from: 't1', to: 'd1' },
  ])
  useEffect(() => {
    $('#q').on('input', function () {
      const v = $(this).val()?.toString().toLowerCase() || ''
      $('.fs-node').each(function () {
        $(this).toggle($(this).text().toLowerCase().includes(v))
      })
    })
  }, [nodes.length])
  function exportDsl() {
    const dsl = {
      name: 'example',
      triggers: ['pull_request'],
      nodes: nodes.map(n => ({ id: n.id, type: n.type })),
      edges,
      env: { CI: 'true' },
    }
    navigator.clipboard.writeText(JSON.stringify(dsl, null, 2))
    alert('DSL copied to clipboard')
  }
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-3">
        <h3 className="text-lg font-semibold">No-Code Flow Studio</h3>
        <input
          id="q"
          className="border rounded px-2 py-1"
          placeholder="filter nodes…"
        />
        <button
          onClick={exportDsl}
          className="ml-auto px-3 py-1 rounded-2xl shadow"
        >
          Export DSL
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {nodes.map(n => (
          <div key={n.id} className="fs-node p-3 rounded-2xl shadow bg-white">
            <div className="text-sm font-semibold">{n.label}</div>
            <div className="text-xs opacity-70">{n.type}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
