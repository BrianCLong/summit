import React, { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface CanaryMetrics {
  successRate: number
  p95Latency: number
  errorRate: number
  costPerRequest: number
  throughput: number
}

interface CanaryConfig {
  id: string
  runId: string
  version: string
  trafficPercent: number
  status:
    | 'pending'
    | 'running'
    | 'paused'
    | 'promoting'
    | 'aborting'
    | 'completed'
  startedAt: string
  duration: number // minutes
  successCriteria: {
    maxErrorRate: number
    maxP95Latency: number
    minSuccessRate: number
    maxCostIncrease: number
  }
  currentMetrics: CanaryMetrics
  baselineMetrics: CanaryMetrics
}

interface AutoCanaryControllerProps {
  runId: string
  onCanaryComplete?: (success: boolean, metrics: CanaryMetrics) => void
}

export function AutoCanaryController({
  runId,
  onCanaryComplete,
}: AutoCanaryControllerProps) {
  const [canaryConfig, setCanaryConfig] = useState<CanaryConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCanaryStatus()
    const interval = setInterval(fetchCanaryStatus, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [runId])

  const fetchCanaryStatus = async () => {
    try {
      const response = await fetch(`/api/maestro/v1/runs/${runId}/canary`)
      if (response.ok) {
        const data = await response.json()
        setCanaryConfig(data)
      }
    } catch (error) {
      console.error('Failed to fetch canary status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualAction = async (
    action: 'promote' | 'abort' | 'pause' | 'resume'
  ) => {
    if (!canaryConfig) return

    try {
      const response = await fetch(
        `/api/maestro/v1/runs/${runId}/canary/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: `Manual ${action} by user`,
            timestamp: new Date().toISOString(),
          }),
        }
      )

      if (response.ok) {
        await fetchCanaryStatus()
        if (action === 'promote' || action === 'abort') {
          onCanaryComplete?.(action === 'promote', canaryConfig.currentMetrics)
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} canary:`, error)
    }
  }

  const calculateVictoryProbability = (): number => {
    if (!canaryConfig) return 0

    const { currentMetrics, baselineMetrics, successCriteria } = canaryConfig

    const errorRateOk = currentMetrics.errorRate <= successCriteria.maxErrorRate
    const latencyOk = currentMetrics.p95Latency <= successCriteria.maxP95Latency
    const successRateOk =
      currentMetrics.successRate >= successCriteria.minSuccessRate
    const costOk =
      currentMetrics.costPerRequest / baselineMetrics.costPerRequest - 1 <=
      successCriteria.maxCostIncrease

    const passedChecks = [errorRateOk, latencyOk, successRateOk, costOk].filter(
      Boolean
    ).length
    return (passedChecks / 4) * 100
  }

  const getStatusColor = (status: string): string => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      running: 'text-blue-600 bg-blue-100',
      paused: 'text-gray-600 bg-gray-100',
      promoting: 'text-green-600 bg-green-100',
      aborting: 'text-red-600 bg-red-100',
      completed: 'text-green-800 bg-green-200',
    }
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!canaryConfig) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
          No canary deployment active
        </div>
      </div>
    )
  }

  const victoryProbability = calculateVictoryProbability()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Auto-Canary Controller
          </h3>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(canaryConfig.status)}`}
        >
          {canaryConfig.status.toUpperCase()}
        </div>
      </div>

      {/* Victory Probability */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-800">Victory Probability</span>
          <span className="text-2xl font-bold text-blue-900">
            {victoryProbability.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              victoryProbability >= 80
                ? 'bg-green-500'
                : victoryProbability >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${victoryProbability}%` }}
          ></div>
        </div>
      </div>

      {/* Canary Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Version</div>
          <div className="font-semibold">{canaryConfig.version}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Traffic Split</div>
          <div className="font-semibold">{canaryConfig.trafficPercent}%</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Duration</div>
          <div className="font-semibold">{canaryConfig.duration}m</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Started</div>
          <div className="font-semibold">
            {new Date(canaryConfig.startedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Metrics Comparison */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
        <div className="space-y-3">
          {/* Success Rate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Success Rate</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono">
                {canaryConfig.baselineMetrics.successRate.toFixed(2)}%
              </span>
              <span className="text-gray-400">→</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  canaryConfig.currentMetrics.successRate >=
                  canaryConfig.successCriteria.minSuccessRate
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {canaryConfig.currentMetrics.successRate.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* P95 Latency */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">P95 Latency</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono">
                {canaryConfig.baselineMetrics.p95Latency}ms
              </span>
              <span className="text-gray-400">→</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  canaryConfig.currentMetrics.p95Latency <=
                  canaryConfig.successCriteria.maxP95Latency
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {canaryConfig.currentMetrics.p95Latency}ms
              </span>
            </div>
          </div>

          {/* Error Rate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Error Rate</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono">
                {canaryConfig.baselineMetrics.errorRate.toFixed(3)}%
              </span>
              <span className="text-gray-400">→</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  canaryConfig.currentMetrics.errorRate <=
                  canaryConfig.successCriteria.maxErrorRate
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {canaryConfig.currentMetrics.errorRate.toFixed(3)}%
              </span>
            </div>
          </div>

          {/* Cost */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Cost/Request</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-mono">
                ${canaryConfig.baselineMetrics.costPerRequest.toFixed(4)}
              </span>
              <span className="text-gray-400">→</span>
              <span
                className={`text-sm font-mono font-semibold ${
                  canaryConfig.currentMetrics.costPerRequest /
                    canaryConfig.baselineMetrics.costPerRequest -
                    1 <=
                  canaryConfig.successCriteria.maxCostIncrease
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                ${canaryConfig.currentMetrics.costPerRequest.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Criteria */}
      <div className="mb-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-700 mb-2">Success Criteria</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            Max Error Rate: {canaryConfig.successCriteria.maxErrorRate}%
          </div>
          <div>
            Max P95 Latency: {canaryConfig.successCriteria.maxP95Latency}ms
          </div>
          <div>
            Min Success Rate: {canaryConfig.successCriteria.minSuccessRate}%
          </div>
          <div>
            Max Cost Increase:{' '}
            {(canaryConfig.successCriteria.maxCostIncrease * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Manual Controls */}
      {canaryConfig.status === 'running' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleManualAction('promote')}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            Promote Now
          </button>

          <button
            onClick={() => handleManualAction('pause')}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <PauseIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => handleManualAction('abort')}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Abort Canary
          </button>
        </div>
      )}

      {canaryConfig.status === 'paused' && (
        <div className="flex space-x-3">
          <button
            onClick={() => handleManualAction('resume')}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            Resume Canary
          </button>

          <button
            onClick={() => handleManualAction('abort')}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Abort
          </button>
        </div>
      )}

      {(canaryConfig.status === 'promoting' ||
        canaryConfig.status === 'aborting') && (
        <div className="flex items-center justify-center py-4 text-gray-600">
          <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
          {canaryConfig.status === 'promoting'
            ? 'Promoting deployment...'
            : 'Aborting canary...'}
        </div>
      )}
    </div>
  )
}

export default AutoCanaryController
