// apps/web/src/components/Explain.tsx
import React from 'react'

interface ExplainProps {
  facts: string[]
  onClose?: () => void
}

export default function Explain({ facts, onClose }: ExplainProps) {
  return (
    <section
      aria-labelledby="explain-title"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 id="explain-title" className="font-bold">
          Explain this view
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        )}
      </div>
      <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
        {facts.map((fact, index) => (
          <li key={index}>{fact}</li>
        ))}
      </ul>
    </section>
  )
}
