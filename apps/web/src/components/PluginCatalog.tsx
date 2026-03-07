import React, { useEffect, useState } from 'react'
import $ from 'jquery'
export default function PluginCatalog() {
  const [rows, setRows] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)
  useEffect(() => {
    fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `{ plugins { id name version digest approved risk capabilities } }`,
      }),
    })
      .then(r => r.json())
      .then(j => setRows(j.data.plugins))
  }, [])
  useEffect(() => {
    $('#q').on('input', function () {
      const v = $(this).val()?.toString().toLowerCase() || ''
      $('.p-row').each(function () {
        $(this).toggle($(this).text().toLowerCase().indexOf(v) >= 0)
      })
    })
  }, [rows.length])
  return (
    <div className="p-4 rounded-2xl shadow">
      <div className="flex gap-2 mb-2">
        <h3 className="text-lg font-semibold">Plugin Catalog</h3>
        <input
          id="q"
          className="border rounded px-2 py-1"
          placeholder="filter…"
          aria-label="Filter plugins"
        />
      </div>
      <table className="w-full text-sm" aria-label="Plugin Catalog">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Version</th>
            <th scope="col">Digest</th>
            <th scope="col">Approved</th>
            <th scope="col">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr
              key={p.id}
              className="p-row border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => setSel(p)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') setSel(p)
              }}
              tabIndex={0}
              role="button"
              aria-label={`Select plugin ${p.name}`}
            >
              <td>{p.name}</td>
              <td>{p.version}</td>
              <td className="truncate">{p.digest}</td>
              <td>{p.approved ? '✅' : '❌'}</td>
              <td>{p.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {sel && (
        <div
          className="mt-4 p-3 rounded-2xl shadow"
          role="region"
          aria-label="Plugin Details"
        >
          <div className="text-sm">
            Capabilities: <code>{JSON.stringify(sel.capabilities)}</code>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => approve(sel.id)}
              className="px-3 py-1 rounded-2xl shadow"
              aria-label={`Approve plugin ${sel.name}`}
            >
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  )
  async function approve(id: string) {
    const reason = prompt('Reason?')
    await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: `mutation { approvePlugin(id:"${id}", risk:"reviewed", reason:${JSON.stringify(reason || '')} ) }`,
      }),
    })
    $('#q').val('') // jQuery flourish
  }
}
