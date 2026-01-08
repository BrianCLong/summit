/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// =============================================
// Maestro Runbooks Management
// =============================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import MonacoEditor from 'react-monaco-editor'
import { useNotification } from '@/contexts/NotificationContext'
import { useMaestroRunSocket } from '@/hooks/useMaestroRunSocket'

const defaultRunbook = JSON.stringify(
  {
    nodes: [
      {
        id: 'ingest',
        kind: 'task',
        name: 'Ingest Sources',
        ref: 'ingest_documents',
        config: { source: 'kb://intelgraph' },
      },
      {
        id: 'analyze',
        kind: 'task',
        name: 'Analyze Signals',
        ref: 'analyze_signals',
        config: { model: 'gpt-4o-mini', temperature: 0.2 },
      },
      {
        id: 'review',
        kind: 'task',
        name: 'Analyst Review',
        ref: 'human_review',
      },
    ],
    edges: [
      { from: 'ingest', to: 'analyze' },
      { from: 'analyze', to: 'review' },
    ],
  },
  null,
  2
)

const schedulePresets = {
  none: '',
  hourly: '0 * * * *',
  daily: '0 0 * * *',
  weekly: '0 0 * * 0',
}

export default function Runbooks() {
  const { showNotification } = useNotification()
  const [runbookName, setRunbookName] = useState('Morning Intel Sweep')
  const [dslText, setDslText] = useState(defaultRunbook)
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [schema, setSchema] = useState<any>(null)
  const [validation, setValidation] = useState<{
    valid: boolean
    schemaErrors?: Array<{ path: string; message: string }>
    dslError?: string | null
  } | null>(null)
  const [simulation, setSimulation] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [running, setRunning] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<string | null>(null)
  const [schedulePreset, setSchedulePreset] =
    useState<keyof typeof schedulePresets>('none')
  const [customCron, setCustomCron] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [nextRunAt, setNextRunAt] = useState<string | null>(null)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)

  const handleStatusUpdate = useCallback(
    update => {
      if (!update.status) return
      setRunStatus(update.status)
      showNotification({
        type: update.status === 'failed' ? 'error' : 'info',
        title: `Run ${update.status}`,
        message: `Run ${update.runId} is now ${update.status}`,
      })
    },
    [showNotification]
  )

  const { connected: socketConnected } = useMaestroRunSocket({
    runId,
    onStatus: handleStatusUpdate,
  })

  useEffect(() => {
    const loadSchema = async () => {
      try {
        const res = await fetch('/api/maestro/pipelines/schema')
        if (res.ok) {
          const payload = await res.json()
          setSchema(payload)
        }
      } catch (error) {
        console.error('Failed to load DSL schema', error)
      }
    }
    loadSchema()
  }, [])

  useEffect(() => {
    if (schema && monacoRef.current) {
      monacoRef.current.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [
          {
            uri:
              schema.$id ||
              'https://intelgraph.dev/schemas/maestro-runbook.json',
            fileMatch: ['*'],
            schema,
          },
        ],
      })
    }
  }, [schema])

  const parseDsl = () => {
    try {
      return { spec: JSON.parse(dslText) }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run()
    }
  }

  const handleValidate = async () => {
    const parsed = parseDsl()
    if (parsed.error) {
      showNotification({
        type: 'error',
        title: 'Invalid JSON',
        message: parsed.error.message,
      })
      return
    }

    setValidating(true)
    try {
      const res = await fetch('/api/maestro/pipelines/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: parsed.spec }),
      })
      const payload = await res.json()
      setValidation(payload)
      showNotification({
        type: payload.valid ? 'success' : 'warning',
        title: payload.valid ? 'Runbook valid' : 'Runbook needs fixes',
      })
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Validation failed',
        message: (error as Error).message,
      })
    } finally {
      setValidating(false)
    }
  }

  const handleSimulate = async () => {
    const parsed = parseDsl()
    if (parsed.error) {
      showNotification({
        type: 'error',
        title: 'Invalid JSON',
        message: parsed.error.message,
      })
      return
    }

    setSimulating(true)
    try {
      const res = await fetch('/api/maestro/pipelines/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: parsed.spec }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.error || 'Simulation failed')
      }
      setSimulation(payload)
      showNotification({
        type: 'info',
        title: 'Simulation complete',
        message: `Estimated cost: $${payload.estimate?.estimatedCostUSD}`,
      })
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Simulation failed',
        message: (error as Error).message,
      })
    } finally {
      setSimulating(false)
    }
  }

  const saveRunbook = async () => {
    const parsed = parseDsl()
    if (parsed.error) {
      showNotification({
        type: 'error',
        title: 'Invalid JSON',
        message: parsed.error.message,
      })
      return null
    }

    setSaving(true)
    try {
      const payload = {
        name: runbookName,
        spec: parsed.spec,
      }

      const res = await fetch(
        pipelineId
          ? `/api/maestro/pipelines/${pipelineId}`
          : '/api/maestro/pipelines',
        {
          method: pipelineId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to save runbook')
      }
      setPipelineId(data.id || pipelineId)
      showNotification({
        type: 'success',
        title: 'Runbook saved',
        message: data.id ? `ID: ${data.id}` : undefined,
      })
      return data.id || pipelineId
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Save failed',
        message: (error as Error).message,
      })
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    if (!runbookName.trim()) {
      showNotification({
        type: 'warning',
        title: 'Name required',
        message: 'Add a runbook name before running.',
      })
      return
    }

    setRunning(true)
    try {
      const pipeline = await saveRunbook()
      if (!pipeline) return
      const res = await fetch('/api/maestro/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipeline_id: pipeline,
          pipeline_name: runbookName,
          input_params: {},
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.error || 'Run failed')
      }
      setRunId(payload.id)
      setRunStatus(payload.status || 'queued')
      showNotification({
        type: 'success',
        title: 'Run queued',
        message: `Run ${payload.id} is queued`,
      })
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Run failed',
        message: (error as Error).message,
      })
    } finally {
      setRunning(false)
    }
  }

  const handleSchedule = async () => {
    const effectiveCron =
      schedulePreset === 'custom' ? customCron : schedulePresets[schedulePreset]
    const enabled = schedulePreset !== 'none'

    if (enabled && !effectiveCron) {
      showNotification({
        type: 'warning',
        title: 'Cron required',
        message: 'Provide a cron expression for the schedule.',
      })
      return
    }

    const pipeline = pipelineId || (await saveRunbook())
    if (!pipeline) return

    try {
      const res = await fetch(`/api/maestro/pipelines/${pipeline}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule: {
            enabled,
            cron: enabled ? effectiveCron : undefined,
            timezone,
          },
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.message || 'Schedule update failed')
      }
      setNextRunAt(payload.nextRunAt || null)
      showNotification({
        type: 'success',
        title: enabled ? 'Schedule saved' : 'Schedule cleared',
        message: payload.nextRunAt
          ? `Next run at ${new Date(payload.nextRunAt).toLocaleString()}`
          : undefined,
      })
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Schedule failed',
        message: (error as Error).message,
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Runbooks</h1>
        <p className="mt-1 text-sm text-gray-600">
          Author Maestro runbooks, validate against the DSL schema, simulate
          costs, and run with live status toasts.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-gray-700"
                htmlFor="runbook-name"
              >
                Runbook name
              </label>
              <div className="flex flex-wrap gap-3">
                <input
                  id="runbook-name"
                  value={runbookName}
                  onChange={e => setRunbookName(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Runbook name"
                  data-testid="runbook-name-input"
                />
                <button
                  onClick={saveRunbook}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={saving}
                  data-testid="runbook-save-button"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
              {pipelineId && (
                <p className="text-xs text-gray-500">
                  Pipeline ID: <span className="font-mono">{pipelineId}</span>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  DSL Editor
                </h2>
                <p className="text-xs text-gray-500">
                  JSON runbook spec with live schema validation.
                </p>
              </div>
              <button
                onClick={handleFormat}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                type="button"
              >
                Format
              </button>
            </div>
            <div className="h-[520px]">
              <MonacoEditor
                language="json"
                theme="vs-dark"
                value={dslText}
                options={{ minimap: { enabled: false }, automaticLayout: true }}
                onChange={setDslText}
                editorDidMount={(editor, monaco) => {
                  editorRef.current = editor
                  monacoRef.current = monaco
                }}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Validation</h3>
            <p className="text-xs text-gray-500">
              Schema + DAG validation against the Maestro DSL.
            </p>
            <button
              onClick={handleValidate}
              disabled={validating}
              className="mt-3 w-full rounded-md border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              data-testid="runbook-validate-button"
            >
              {validating ? 'Validating…' : 'Validate Runbook'}
            </button>
            {validation && (
              <div className="mt-3 space-y-2 text-xs">
                <div
                  className={`rounded-md px-3 py-2 ${
                    validation.valid
                      ? 'bg-green-50 text-green-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {validation.valid ? 'Valid runbook' : 'Issues detected'}
                </div>
                {validation.dslError && (
                  <p className="text-red-600">{validation.dslError}</p>
                )}
                {validation.schemaErrors?.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-red-600">
                    {validation.schemaErrors.map((err, index) => (
                      <li key={`${err.path}-${index}`}>
                        {err.path}: {err.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">
              Cost Simulation
            </h3>
            <p className="text-xs text-gray-500">
              EXPLAIN + sampling estimate for runtime and spend.
            </p>
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="mt-3 w-full rounded-md border border-gray-900 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
              data-testid="runbook-simulate-button"
            >
              {simulating ? 'Simulating…' : 'Simulate Cost'}
            </button>
            {simulation?.estimate && (
              <div className="mt-3 space-y-2 text-xs text-gray-700">
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  Estimated cost: $
                  {simulation.estimate.estimatedCostUSD?.toFixed(4)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border px-2 py-1">
                    Nodes: {simulation.estimate.nodes}
                  </div>
                  <div className="rounded-md border px-2 py-1">
                    Edges: {simulation.estimate.edges}
                  </div>
                  <div className="rounded-md border px-2 py-1">
                    Duration: {simulation.estimate.estimatedDurationMs}ms
                  </div>
                  <div className="rounded-md border px-2 py-1">
                    Tasks: {simulation.estimate.taskNodes}
                  </div>
                </div>
                {simulation.explain?.assumptions?.length > 0 && (
                  <div className="rounded-md border bg-white px-3 py-2 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700">Assumptions</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {simulation.explain.assumptions.map(
                        (assumption: string, index: number) => (
                          <li key={`${assumption}-${index}`}>{assumption}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
                {simulation.sampledRuns?.length > 0 && (
                  <div className="rounded-md border bg-white px-3 py-2 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700">Sampled runs</p>
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      {simulation.sampledRuns.map(
                        (sample: any, index: number) => (
                          <div
                            key={`${sample.run}-${index}`}
                            className="flex items-center justify-between rounded border px-2 py-1"
                          >
                            <span>Run {sample.run}</span>
                            <span>
                              ${sample.estimatedCostUSD} ·{' '}
                              {sample.estimatedDurationMs}ms
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Run Panel</h3>
            <p className="text-xs text-gray-500">
              Execute the runbook and receive live status toasts.
            </p>
            <button
              onClick={handleRun}
              disabled={running}
              className="mt-3 w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              data-testid="runbook-run-button"
            >
              {running ? 'Running…' : 'Run Now'}
            </button>
            <div className="mt-3 space-y-1 text-xs text-gray-600">
              <div>
                Socket status:{' '}
                <span
                  className={`font-semibold ${
                    socketConnected ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {socketConnected ? 'connected' : 'offline'}
                </span>
              </div>
              {runId && (
                <>
                  <div>
                    Run ID: <span className="font-mono">{runId}</span>
                  </div>
                  <div>
                    Status:{' '}
                    <span className="font-semibold text-gray-900">
                      {runStatus || 'queued'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Scheduling</h3>
            <p className="text-xs text-gray-500">
              Configure cron-lite schedules for automated runs.
            </p>
            <div className="mt-3 space-y-2 text-xs text-gray-700">
              <label className="text-xs font-medium text-gray-600">
                Preset
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={schedulePreset}
                onChange={e =>
                  setSchedulePreset(
                    e.target.value as keyof typeof schedulePresets
                  )
                }
              >
                <option value="none">No schedule</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom cron</option>
              </select>
              {schedulePreset === 'custom' && (
                <input
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  placeholder="*/15 * * * *"
                  value={customCron}
                  onChange={e => setCustomCron(e.target.value)}
                />
              )}
              <label className="text-xs font-medium text-gray-600">
                Timezone
              </label>
              <input
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
              />
              <button
                onClick={handleSchedule}
                className="w-full rounded-md border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                data-testid="runbook-schedule-button"
              >
                Apply schedule
              </button>
              {nextRunAt && (
                <p className="text-xs text-gray-500">
                  Next run: {new Date(nextRunAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
