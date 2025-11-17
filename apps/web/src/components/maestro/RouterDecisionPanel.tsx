import React, { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface RouterCandidate {
  model: string
  score: number
  reason: string
  cost_estimate?: number
  latency_p95?: number
}

interface RouterDecision {
  id: string
  runId: string
  nodeId: string
  selectedModel: string
  candidates: RouterCandidate[]
  policyApplied?: string
  overrideReason?: string
  timestamp: string
  canOverride: boolean
}

interface RouterDecisionPanelProps {
  runId: string
  nodeId: string
  className?: string
}

export function RouterDecisionPanel({
  runId,
  nodeId,
  className = '',
}: RouterDecisionPanelProps) {
  const [decision, setDecision] = useState<RouterDecision | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [selectedOverrideModel, setSelectedOverrideModel] = useState('')

  useEffect(() => {
    fetchRouterDecision()
  }, [runId, nodeId])

  const fetchRouterDecision = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/maestro/v1/runs/${runId}/nodes/${nodeId}/routing`
      )
      const data = await response.json()
      setDecision(data)
    } catch (error) {
      console.error('Failed to fetch router decision:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOverride = async () => {
    if (!selectedOverrideModel || !overrideReason.trim()) return

    try {
      const response = await fetch(
        `/api/maestro/v1/runs/${runId}/nodes/${nodeId}/override-routing`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedOverrideModel,
            reason: overrideReason,
          }),
        }
      )

      if (response.ok) {
        await fetchRouterDecision() // Refresh data
        setShowOverrideDialog(false)
        setOverrideReason('')
        setSelectedOverrideModel('')
      }
    } catch (error) {
      console.error('Failed to override routing:', error)
    }
  }

  const exportToAudit = async () => {
    try {
      const response = await fetch(
        `/api/maestro/v1/audit/router-decisions/${decision?.id}/export`
      )
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `router-decision-${decision?.id}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export audit:', error)
    }
  }

  if (loading) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!decision) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      >
        <div className="text-center text-gray-500">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
          No router decision available
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Router Decision
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToAudit}
            className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded border"
          >
            Export Audit
          </button>
          {decision.canOverride && (
            <button
              onClick={() => setShowOverrideDialog(true)}
              className="text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded"
            >
              Override
            </button>
          )}
        </div>
      </div>

      {/* Selected Model */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-800">Selected Model</span>
        </div>
        <div className="text-lg font-semibold text-green-900">
          {decision.selectedModel}
        </div>
        {decision.overrideReason && (
          <div className="mt-2 text-sm text-orange-700 bg-orange-100 p-2 rounded">
            <strong>Override:</strong> {decision.overrideReason}
          </div>
        )}
      </div>

      {/* Policy Applied */}
      {decision.policyApplied && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Policy Applied:</strong> {decision.policyApplied}
          </div>
        </div>
      )}

      {/* Candidates */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-3">
          Model Candidates & Scores
        </h4>
        <div className="space-y-3">
          {decision.candidates.map((candidate, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                candidate.model === decision.selectedModel
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">
                  {candidate.model}
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {candidate.score.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">Score</div>
                  </div>
                  {candidate.model === decision.selectedModel && (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-2">
                {candidate.reason}
              </div>

              {/* Additional metrics */}
              <div className="flex space-x-4 text-xs text-gray-500">
                {candidate.cost_estimate !== undefined && (
                  <div>
                    <span className="font-medium">Cost:</span> $
                    {candidate.cost_estimate.toFixed(4)}
                  </div>
                )}
                {candidate.latency_p95 !== undefined && (
                  <div>
                    <span className="font-medium">P95:</span>{' '}
                    {candidate.latency_p95}ms
                  </div>
                )}
              </div>

              {/* Score bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    candidate.model === decision.selectedModel
                      ? 'bg-green-600'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(candidate.score * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 border-t pt-3">
        Decision made: {new Date(decision.timestamp).toLocaleString()}
      </div>

      {/* Override Dialog */}
      {showOverrideDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Override Router Decision
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Model
              </label>
              <select
                value={selectedOverrideModel}
                onChange={e => setSelectedOverrideModel(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Choose a model...</option>
                {decision.candidates.map(candidate => (
                  <option key={candidate.model} value={candidate.model}>
                    {candidate.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Justification
              </label>
              <textarea
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Explain why you're overriding the router decision..."
                className="w-full border border-gray-300 rounded px-3 py-2 h-20"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowOverrideDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOverride}
                disabled={!selectedOverrideModel || !overrideReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
              >
                Override Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RouterDecisionPanel
