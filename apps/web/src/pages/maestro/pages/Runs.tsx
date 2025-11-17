// =============================================
// Maestro Runs Management - Live DAG Viewer
// =============================================
import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { useTenant } from '../../../contexts/TenantContext'
import { useNotification } from '../../../contexts/NotificationContext'

// Mock data types
interface RunStep {
  id: string
  name: string
  status:
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'retrying'
  startTime?: Date
  endTime?: Date
  duration?: number
  retryCount: number
  cost?: number
  tokens?: number
  provider?: string
  logs?: string[]
  artifacts?: string[]
}

interface Run {
  id: string
  name: string
  runbook: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: Date
  endTime?: Date
  duration?: number
  trigger: 'manual' | 'scheduled' | 'webhook' | 'api'
  triggeredBy: string
  environment: string
  cost: number
  steps: RunStep[]
  tags: string[]
}

// Mock runs data
const mockRuns: Run[] = Array.from({ length: 50 }, (_, i) => {
  const statuses: Run['status'][] = ['completed', 'running', 'failed', 'queued']
  const triggers: Run['trigger'][] = ['manual', 'scheduled', 'webhook', 'api']
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  const startTime = new Date(Date.now() - Math.random() * 86400000 * 7) // Last 7 days

  return {
    id: `run_${i + 1}`,
    name: `Build Pipeline ${i + 1}`,
    runbook: 'intelgraph-build-pipeline',
    status,
    startTime,
    endTime:
      status === 'completed' || status === 'failed'
        ? new Date(startTime.getTime() + Math.random() * 3600000)
        : undefined,
    duration:
      status === 'completed' || status === 'failed'
        ? Math.floor(Math.random() * 3600)
        : undefined,
    trigger: triggers[Math.floor(Math.random() * triggers.length)],
    triggeredBy: 'user@example.com',
    environment: 'production',
    cost: Math.random() * 10,
    tags: ['build', 'deploy'],
    steps: Array.from({ length: 5 }, (_, j) => ({
      id: `step_${j + 1}`,
      name: `Step ${j + 1}`,
      status:
        j < 3
          ? 'completed'
          : j === 3 && status === 'running'
            ? 'running'
            : 'queued',
      startTime: new Date(startTime.getTime() + j * 300000),
      endTime:
        j < 3 ? new Date(startTime.getTime() + (j + 1) * 300000) : undefined,
      duration: j < 3 ? 300 : undefined,
      retryCount: 0,
      cost: Math.random() * 2,
      tokens: Math.floor(Math.random() * 1000),
      provider: 'gpt-4o-mini',
    })),
  }
})

function RunsTable() {
  const navigate = useNavigate()
  const { hasPermission } = useTenant()
  const { showNotification } = useNotification()
  const [runs, setRuns] = useState<Run[]>(mockRuns)
  const [filteredRuns, setFilteredRuns] = useState<Run[]>(mockRuns)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedRuns, setSelectedRuns] = useState<string[]>([])

  // Filter runs based on search and status
  useEffect(() => {
    const filtered = runs.filter(run => {
      const matchesSearch =
        run.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.runbook.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.triggeredBy.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || run.status === statusFilter
      return matchesSearch && matchesStatus
    })
    setFilteredRuns(filtered)
  }, [runs, searchQuery, statusFilter])

  const getStatusColor = (status: Run['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 ring-green-600/20'
      case 'running':
        return 'text-blue-700 bg-blue-50 ring-blue-600/20'
      case 'failed':
        return 'text-red-700 bg-red-50 ring-red-600/20'
      case 'cancelled':
        return 'text-gray-700 bg-gray-50 ring-gray-600/20'
      case 'queued':
        return 'text-yellow-700 bg-yellow-50 ring-yellow-600/20'
      default:
        return 'text-gray-700 bg-gray-50 ring-gray-600/20'
    }
  }

  const getStatusIcon = (status: Run['status']) => {
    switch (status) {
      case 'completed':
        return CheckCircleIcon
      case 'running':
        return PlayIcon
      case 'failed':
        return XCircleIcon
      case 'cancelled':
        return StopIcon
      case 'queued':
        return ClockIcon
      default:
        return ClockIcon
    }
  }

  const handleRunAction = async (
    runId: string,
    action: 'pause' | 'resume' | 'cancel' | 'retry'
  ) => {
    if (!hasPermission('runs.control')) {
      showNotification({
        type: 'warning',
        title: 'Permission denied',
        message: `You don't have permission to ${action} runs`,
      })
      return
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    setRuns(prev =>
      prev.map(run => {
        if (run.id === runId) {
          switch (action) {
            case 'pause':
              return { ...run, status: 'cancelled' as const }
            case 'cancel':
              return { ...run, status: 'cancelled' as const }
            case 'retry':
              return { ...run, status: 'queued' as const }
            default:
              return run
          }
        }
        return run
      })
    )

    showNotification({
      type: 'success',
      title: `Run ${action}ed`,
      message: `Run ${runId} has been ${action}ed successfully`,
    })
  }

  const handleBulkAction = async (action: 'cancel' | 'retry') => {
    if (selectedRuns.length === 0) return

    for (const runId of selectedRuns) {
      await handleRunAction(runId, action)
    }

    setSelectedRuns([])
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Runs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and control your pipeline executions
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/maestro/runbooks')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            New Run
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search runs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRuns.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedRuns.length} run{selectedRuns.length > 1 ? 's' : ''}{' '}
              selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => handleBulkAction('cancel')}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Cancel Selected
              </button>
              <button
                onClick={() => handleBulkAction('retry')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Retry Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Runs Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedRuns.length === filteredRuns.length}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedRuns(filteredRuns.map(r => r.id))
                    } else {
                      setSelectedRuns([])
                    }
                  }}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Run
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trigger
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRuns.map(run => {
              const StatusIcon = getStatusIcon(run.status)
              return (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedRuns.includes(run.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedRuns(prev => [...prev, run.id])
                        } else {
                          setSelectedRuns(prev =>
                            prev.filter(id => id !== run.id)
                          )
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {run.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {run.runbook} • {run.environment}
                      </div>
                      <div className="text-xs text-gray-400">
                        {run.startTime.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(run.status)}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{run.trigger}</div>
                    <div className="text-xs">{run.triggeredBy}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {run.duration
                      ? `${Math.floor(run.duration / 60)}m ${run.duration % 60}s`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${run.cost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/maestro/runs/${run.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>

                      {run.status === 'running' && (
                        <button
                          onClick={() => handleRunAction(run.id, 'pause')}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Pause"
                        >
                          <PauseIcon className="h-4 w-4" />
                        </button>
                      )}

                      {(run.status === 'running' ||
                        run.status === 'queued') && (
                        <button
                          onClick={() => handleRunAction(run.id, 'cancel')}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel"
                        >
                          <StopIcon className="h-4 w-4" />
                        </button>
                      )}

                      {(run.status === 'failed' ||
                        run.status === 'cancelled') && (
                        <button
                          onClick={() => handleRunAction(run.id, 'retry')}
                          className="text-green-600 hover:text-green-900"
                          title="Retry"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RunDetail() {
  const { runId } = useParams<{ runId: string }>()
  const run = mockRuns.find(r => r.id === runId)

  if (!run) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Run not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The run you're looking for doesn't exist or has been deleted.
        </p>
      </div>
    )
  }

  return <RunDetailView run={run} />
}

function RunDetailView({ run }: { run: Run }) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'dag' | 'logs' | 'artifacts'
  >('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{run.name}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Run ID: {run.id} • {run.runbook}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ring-1 ring-inset ${getStatusColor(run.status)}`}
              >
                {run.status}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Duration
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {run.duration
                          ? `${Math.floor(run.duration / 60)}m ${run.duration % 60}s`
                          : 'In progress'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Steps
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {run.steps.filter(s => s.status === 'completed').length}{' '}
                        / {run.steps.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 overflow-hidden rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Cost
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${run.cost.toFixed(2)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'dag', label: 'DAG' },
              { key: 'logs', label: 'Logs' },
              { key: 'artifacts', label: 'Artifacts' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {activeTab === 'overview' && <OverviewTab run={run} />}
          {activeTab === 'dag' && <DAGTab run={run} />}
          {activeTab === 'logs' && <LogsTab run={run} />}
          {activeTab === 'artifacts' && <ArtifactsTab run={run} />}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ run }: { run: Run }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Run Information
        </h3>
        <div className="mt-5 border-t border-gray-200">
          <dl className="divide-y divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                Triggered by
              </dt>
              <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="flex-grow">{run.triggeredBy}</span>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Environment</dt>
              <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="flex-grow">{run.environment}</span>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Start time</dt>
              <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="flex-grow">
                  {run.startTime.toLocaleString()}
                </span>
              </dd>
            </div>
            {run.endTime && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">End time</dt>
                <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="flex-grow">
                    {run.endTime.toLocaleString()}
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}

function DAGTab({ run }: { run: Run }) {
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Execution Graph
      </h3>
      <div className="space-y-4">
        {run.steps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-4">
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : step.status === 'running'
                    ? 'bg-blue-100 text-blue-800 animate-pulse'
                    : step.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
              }`}
            >
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{step.name}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  {step.cost && <span>${step.cost.toFixed(2)}</span>}
                  {step.tokens && <span>{step.tokens} tokens</span>}
                  {step.provider && <span>{step.provider}</span>}
                </div>
              </div>
              {step.duration && (
                <p className="text-sm text-gray-500">
                  Duration: {Math.floor(step.duration / 60)}m{' '}
                  {step.duration % 60}s
                </p>
              )}
            </div>

            <div
              className={`flex-shrink-0 w-20 h-2 rounded-full ${
                step.status === 'completed'
                  ? 'bg-green-200'
                  : step.status === 'running'
                    ? 'bg-blue-200'
                    : step.status === 'failed'
                      ? 'bg-red-200'
                      : 'bg-gray-200'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function LogsTab({ run }: { run: Run }) {
  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Execution Logs
      </h3>
      <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 h-96 overflow-y-auto">
        <div className="space-y-1">
          {run.steps.flatMap((step, stepIndex) => [
            <div key={`${step.id}-start`} className="text-blue-400">
              [{step.startTime?.toLocaleTimeString()}] Starting step:{' '}
              {step.name}
            </div>,
            ...Array.from(
              { length: Math.floor(Math.random() * 5) + 2 },
              (_, logIndex) => (
                <div
                  key={`${step.id}-log-${logIndex}`}
                  className="text-gray-300"
                >
                  [{step.startTime?.toLocaleTimeString()}] Processing...{' '}
                  {Math.random().toString(36).slice(2)}
                </div>
              )
            ),
            <div
              key={`${step.id}-end`}
              className={
                step.status === 'completed'
                  ? 'text-green-400'
                  : step.status === 'failed'
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }
            >
              [{step.endTime?.toLocaleTimeString() || 'In progress'}] Step{' '}
              {step.status}: {step.name}
            </div>,
          ])}
        </div>
      </div>
    </div>
  )
}

function ArtifactsTab({ run }: { run: Run }) {
  const artifacts = [
    { name: 'build-output.tar.gz', size: '15.2 MB', type: 'archive' },
    { name: 'test-results.xml', size: '245 KB', type: 'test-report' },
    { name: 'coverage-report.html', size: '1.8 MB', type: 'report' },
  ]

  return (
    <div>
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Generated Artifacts
      </h3>
      <div className="space-y-3">
        {artifacts.map((artifact, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <DocumentArrowDownIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {artifact.name}
                </p>
                <p className="text-sm text-gray-500">
                  {artifact.size} • {artifact.type}
                </p>
              </div>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Runs() {
  return (
    <div className="p-6">
      <Routes>
        <Route index element={<RunsTable />} />
        <Route path=":runId" element={<RunDetail />} />
      </Routes>
    </div>
  )
}

// Helper functions
function getStatusColor(status: Run['status']) {
  switch (status) {
    case 'completed':
      return 'text-green-700 bg-green-50 ring-green-600/20'
    case 'running':
      return 'text-blue-700 bg-blue-50 ring-blue-600/20'
    case 'failed':
      return 'text-red-700 bg-red-50 ring-red-600/20'
    case 'cancelled':
      return 'text-gray-700 bg-gray-50 ring-gray-600/20'
    case 'queued':
      return 'text-yellow-700 bg-yellow-50 ring-yellow-600/20'
    default:
      return 'text-gray-700 bg-gray-50 ring-gray-600/20'
  }
}
