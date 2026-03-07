import React, { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface PrecisionRecallPoint {
  date: string
  metric_name: 'precision' | 'recall'
  value: number
  model_version?: string
}

interface RollbackPoint {
  date: string
  rollbacks: number
  total_deployments: number
}

interface ConflictPoint {
  conflict_reason: string
  count: number
}

interface GuardrailStatus {
  datasetId: string
  passed: boolean
  metrics: {
    precision: number
    recall: number
    totalPairs: number
  }
  thresholds: {
    minPrecision: number
    minRecall: number
    matchThreshold: number
  }
  evaluatedAt: string
  latestOverride?: {
    datasetId: string
    reason: string
    actorId?: string
    mergeId?: string
    createdAt: string
  } | null
}

const COLORS = ['#6366f1', '#f97316', '#14b8a6', '#eab308', '#ec4899']

const formatPercent = (value?: number) =>
  value === undefined ? '--' : `${(value * 100).toFixed(1)}%`

export function EROpsPanel() {
  const [precisionData, setPrecisionData] = useState<PrecisionRecallPoint[]>([])
  const [rollbackData, setRollbackData] = useState<RollbackPoint[]>([])
  const [conflictData, setConflictData] = useState<ConflictPoint[]>([])
  const [guardrailStatus, setGuardrailStatus] =
    useState<GuardrailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [
          precisionResponse,
          rollbackResponse,
          conflictResponse,
          guardrailResponse,
        ] = await Promise.all([
          fetch('/api/ga-core-metrics/er-ops/precision-recall?days=30'),
          fetch('/api/ga-core-metrics/er-ops/rollbacks?days=30'),
          fetch('/api/ga-core-metrics/er-ops/conflicts?days=30'),
          fetch('/api/er/guardrails/status'),
        ])

        if (!precisionResponse.ok) {
          throw new Error('Failed to load precision/recall trends')
        }
        if (!rollbackResponse.ok) {
          throw new Error('Failed to load rollback metrics')
        }
        if (!conflictResponse.ok) {
          throw new Error('Failed to load conflict metrics')
        }
        if (!guardrailResponse.ok) {
          throw new Error('Failed to load guardrail status')
        }

        const precisionJson = await precisionResponse.json()
        const rollbackJson = await rollbackResponse.json()
        const conflictJson = await conflictResponse.json()
        const guardrailJson = await guardrailResponse.json()

        if (!active) return

        setPrecisionData(precisionJson.data || [])
        setRollbackData(rollbackJson.data || [])
        setConflictData(conflictJson.data || [])
        setGuardrailStatus(guardrailJson || null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load metrics')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const precisionTrend = useMemo(() => {
    const map = new Map<
      string,
      { date: string; precision?: number; recall?: number }
    >()
    precisionData.forEach(point => {
      const entry = map.get(point.date) || { date: point.date }
      const value = Number(point.value)
      if (point.metric_name === 'precision') {
        entry.precision = value
      } else {
        entry.recall = value
      }
      map.set(point.date, entry)
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [precisionData])

  const rollbackTrend = useMemo(
    () =>
      rollbackData
        .map(point => ({
          date: point.date,
          rollbacks: Number(point.rollbacks),
          total: Number(point.total_deployments),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [rollbackData]
  )

  const conflictSummary = useMemo(
    () =>
      conflictData.map(point => ({
        name: point.conflict_reason,
        count: Number(point.count),
      })),
    [conflictData]
  )

  const latestTrend = precisionTrend[precisionTrend.length - 1]
  const totalRollbacks = rollbackTrend.reduce(
    (sum, point) => sum + point.rollbacks,
    0
  )
  const topConflict = conflictSummary[0]?.name
  const guardrailOverride = guardrailStatus?.latestOverride
  const guardrailBadge = guardrailStatus?.passed ? 'PASS' : 'FAIL'

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>ER Ops</CardTitle>
          <p className="text-sm text-muted-foreground">
            Precision, recall, rollbacks, and conflict signals
          </p>
        </div>
        <Badge variant="secondary">Ops</Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Guardrails
                  </h4>
                  <Badge
                    variant={
                      guardrailStatus?.passed ? 'secondary' : 'destructive'
                    }
                  >
                    {guardrailStatus ? guardrailBadge : '---'}
                  </Badge>
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Precision</span>
                    <span>
                      {formatPercent(guardrailStatus?.metrics?.precision)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Recall</span>
                    <span>
                      {formatPercent(guardrailStatus?.metrics?.recall)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Dataset: {guardrailStatus?.datasetId || '--'} · Thresholds{' '}
                  {formatPercent(guardrailStatus?.thresholds?.minPrecision)}/
                  {formatPercent(guardrailStatus?.thresholds?.minRecall)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Override:{' '}
                  {guardrailOverride
                    ? `${guardrailOverride.reason} (${guardrailOverride.actorId || 'unknown'})`
                    : 'None'}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Latest Precision
                </h4>
                <div className="text-2xl font-semibold">
                  {formatPercent(latestTrend?.precision)}
                </div>
                <p className="text-xs text-muted-foreground">30-day trend</p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Latest Recall
                </h4>
                <div className="text-2xl font-semibold">
                  {formatPercent(latestTrend?.recall)}
                </div>
                <p className="text-xs text-muted-foreground">30-day trend</p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Rollbacks (30d)
                </h4>
                <div className="text-2xl font-semibold">{totalRollbacks}</div>
                <p className="text-xs text-muted-foreground">
                  Latest conflict: {topConflict || 'None'}
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Precision vs Recall
                </h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={precisionTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 1]} />
                      <Tooltip
                        formatter={(value: number) => formatPercent(value)}
                      />
                      <Line
                        type="monotone"
                        dataKey="precision"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="recall"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Rollback Counts
                </h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rollbackTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="rollbacks"
                        fill="#f97316"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border p-4 md:col-span-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Conflict Reasons
                </h4>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={conflictSummary}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {conflictSummary.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
