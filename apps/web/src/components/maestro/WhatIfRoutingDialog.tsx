// =============================================
// Router Decision What-If Dialog
// =============================================
import React, { useRef, useState } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { XMarkIcon } from '@heroicons/react/24/outline'

// Mock API functions (would come from maestroApi)
const mockRoutePreview = async (_task: string) => {
  await new Promise(resolve => setTimeout(resolve, 300))
  return {
    candidates: [
      {
        id: 'gpt-4o-mini',
        type: 'model',
        name: 'GPT‑4o‑mini',
        score: 0.82,
        cost_est: 0.004,
        latency_est_ms: 950,
        rationale: 'High prior win‑rate on Q/A; low cost.',
      },
      {
        id: 'web-serp',
        type: 'web',
        name: 'SERP+Reader',
        score: 0.74,
        cost_est: 0.002,
        latency_est_ms: 1200,
        rationale: 'Freshness likely needed; medium reliability.',
      },
      {
        id: 'claude-3.5',
        type: 'model',
        name: 'Claude 3.5',
        score: 0.68,
        cost_est: 0.012,
        latency_est_ms: 1300,
        rationale: 'Better on synthesis; higher cost.',
      },
    ],
  }
}

const mockRouteExecute = async (task: string, selection: string[]) => {
  await new Promise(resolve => setTimeout(resolve, 500))
  return {
    runId: `run_${Math.random().toString(36).slice(2)}`,
    steps: selection.map((source, i) => ({
      id: `step${i + 1}`,
      source,
      status: Math.random() > 0.8 ? 'fail' : 'ok',
      tokens: Math.floor(Math.random() * 1000) + 100,
      cost: Math.random() * 0.01,
      citations: [{ title: 'Sample source', url: 'https://example.com' }],
      elapsed_ms: Math.floor(Math.random() * 2000) + 500,
    })),
  }
}

interface WhatIfRoutingDialogProps {
  open: boolean
  onClose: () => void
  route?: string
  defaultModel?: string
  tenant?: string
}

export default function WhatIfRoutingDialog({
  open,
  onClose,
  route = 'codegen',
  defaultModel = 'gpt-4o-mini',
}: WhatIfRoutingDialogProps) {
  const root = useRef<HTMLDivElement>(null)
  useFocusTrap(root, open)

  const [task, setTask] = useState(
    "Summarize today's top three developments on ACME Corp."
  )
  const [model, setModel] = useState(defaultModel)
  const [tokens, setTokens] = useState(1500)
  const [selected, setSelected] = useState<string[]>([])

  const [previewData, setPreviewData] = useState<any>(null)
  const [executeData, setExecuteData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handlePreview = async () => {
    setLoading(true)
    try {
      const data = await mockRoutePreview(task)
      setPreviewData(data)
      if (data.candidates.length > 0) {
        setSelected([data.candidates[0].id])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (selected.length === 0) return

    setLoading(true)
    try {
      const data = await mockRouteExecute(task, selected)
      setExecuteData(data)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyPin = async () => {
    if (!selected.length) return

    // Mock policy check
    const policyOk = Math.random() > 0.3 // 70% chance of allowing

    if (!policyOk) {
      const proceed = confirm(
        'Policy would DENY pin. Proceed anyway (audited)?'
      )
      if (!proceed) return
    }

    // Mock pin API call
    alert('Route pinned successfully!')
    onClose()
  }

  if (!open) return null

  const totalCost =
    previewData?.candidates
      ?.filter((c: any) => selected.includes(c.id))
      ?.reduce((sum: number, c: any) => sum + c.cost_est, 0) || 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatif-title"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div
        ref={root}
        className="bg-white rounded-2xl shadow-xl w-[min(860px,95vw)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="whatif-title" className="text-lg font-semibold">
            What-If: Router Decision
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close dialog"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Description
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="Enter task description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={model}
                onChange={e => setModel(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tokens
              </label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={tokens}
                onChange={e => setTokens(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              onClick={handlePreview}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Simulate'}
            </button>

            {previewData && selected.length > 0 && (
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                onClick={handleExecute}
                disabled={loading}
              >
                Run Selected
              </button>
            )}
          </div>

          {/* Preview Results */}
          {previewData && (
            <div className="space-y-6">
              {/* Candidates Selection */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Route Candidates</h3>
                  <div className="text-sm text-gray-600">
                    Projected cost: ${totalCost.toFixed(3)}
                  </div>
                </div>

                <div className="space-y-3">
                  {previewData.candidates.map((candidate: any) => (
                    <label
                      key={candidate.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(candidate.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelected(prev => [...prev, candidate.id])
                          } else {
                            setSelected(prev =>
                              prev.filter(id => id !== candidate.id)
                            )
                          }
                        }}
                        className="h-4 w-4 text-blue-600"
                      />

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{candidate.name}</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {candidate.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            score {Math.round(candidate.score * 100)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {candidate.rationale}
                        </p>
                      </div>

                      <div className="text-right text-sm space-y-1">
                        <div className="font-medium">
                          ${candidate.cost_est.toFixed(3)}
                        </div>
                        <div className="text-gray-500">
                          {candidate.latency_est_ms}ms
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Candidate Scores Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Score Comparison</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={previewData.candidates}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          `${Number(value).toFixed(2)}`,
                          'Score',
                        ]}
                        labelFormatter={label => `Model: ${label}`}
                      />
                      <Bar dataKey="score" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Higher scores indicate better cost/latency/availability
                  balance
                </p>
              </div>

              {/* Policy Decision */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Policy Analysis</h3>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                    ALLOW
                  </span>
                  <span className="text-sm text-gray-600">
                    Selected routes pass all policy checks
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Cost threshold:</span>
                    <span className="text-green-600">✓ Pass</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Availability requirement:</span>
                    <span className="text-green-600">✓ Pass</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Latency SLA:</span>
                    <span className="text-green-600">✓ Pass</span>
                  </div>
                </div>

                {selected.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleApplyPin}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Apply as Route Pin
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      This will pin the selected model for the {route} route
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Execution Results */}
          {executeData && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Execution Results</h3>
              <div className="space-y-3">
                {executeData.steps.map((step: any) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-md border-l-4 ${
                      step.status === 'ok'
                        ? 'border-green-400 bg-green-50'
                        : 'border-red-400 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{step.source}</span>
                        <span
                          className={`ml-2 px-2 py-1 text-xs rounded ${
                            step.status === 'ok'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {step.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {step.elapsed_ms}ms • ${step.cost.toFixed(3)} •{' '}
                        {step.tokens} tokens
                      </div>
                    </div>

                    {step.citations && step.citations.length > 0 && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Sources: </span>
                        {step.citations.map((cite: any, i: number) => (
                          <a
                            key={i}
                            href={cite.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline mr-2"
                          >
                            {cite.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
