// apps/web/src/components/Explain.tsx
import React from 'react'

export default function Explain({ facts }: { facts: string[] }) {
  return (
    <div
      role="dialog"
      aria-label="Explain this view"
      className="fixed bottom-4 right-4 bg-white p-4 shadow-lg rounded-lg border border-gray-200 z-50"
    >
      <h3 className="font-bold mb-2">Explain this view</h3>
      <ul className="list-disc pl-5">
        {facts.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  )
}
