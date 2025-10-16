import React from 'react'
export function AERBadge({ aer }: { aer: any }) {
  const status = aer ? 'AER?' : 'No AER'
  return (
    <span
      className="px-2 py-1 rounded-2xl text-xs bg-gray-100"
      data-aer={encodeURIComponent(JSON.stringify(aer || {}))}
    >
      {status}
    </span>
  )
}
