import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Bar } from 'recharts/es6/cartesian/Bar.js'
import { Download } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import {
  buildUsageExportUrl,
  fetchTenantUsageRollups,
  type UsageRollupResponse,
} from '@/lib/api/usage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value)

const toIsoDate = (dateValue: string, endOfDay = false) =>
  new Date(
    `${dateValue}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`
  ).toISOString()

export default function UsageCostDashboard() {
  const { currentTenant } = useTenant()
  const [usageData, setUsageData] = useState<UsageRollupResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    const loadUsage = async () => {
      if (!currentTenant?.id) {
        return
      }
      setLoading(true)
      setErrorMessage(null)
      try {
        const response = await fetchTenantUsageRollups(currentTenant.id, {
          from: toIsoDate(fromDate),
          to: toIsoDate(toDate, true),
        })
        setUsageData(response)
      } catch (error: any) {
        setErrorMessage(error?.message || 'Failed to load usage')
      } finally {
        setLoading(false)
      }
    }

    void loadUsage()
  }, [currentTenant?.id, fromDate, toDate])

  const usageTotals = useMemo(() => {
    if (!usageData?.rollups) {
      return []
    }
    const totals = new Map<string, { total: number; unit?: string }>()
    usageData.rollups.forEach(rollup => {
      const entry = totals.get(rollup.dimension) ?? {
        total: 0,
        unit: rollup.unit,
      }
      entry.total += rollup.totalQuantity
      totals.set(rollup.dimension, entry)
    })
    return Array.from(totals.entries()).map(([dimension, values]) => ({
      dimension,
      total: values.total,
      unit: values.unit,
    }))
  }, [usageData])

  const costSeries = useMemo(() => {
    if (!usageData?.rollups) {
      return []
    }
    const totals = new Map<string, { cost: number; date: Date }>()
    usageData.rollups.forEach(rollup => {
      const date = new Date(rollup.periodStart)
      const label = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const entry = totals.get(label) ?? { cost: 0, date }
      entry.cost += rollup.estimatedCost ?? 0
      totals.set(label, entry)
    })
    return Array.from(totals.entries())
      .map(([label, values]) => ({
        label,
        cost: values.cost,
        date: values.date,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [usageData])

  const totalCost =
    usageData?.totalEstimatedCost ??
    usageData?.rollups?.reduce(
      (sum, rollup) => sum + (rollup.estimatedCost ?? 0),
      0
    ) ??
    0

  const handleExport = (format: 'csv' | 'json') => {
    if (!currentTenant?.id) {
      return
    }
    const url = buildUsageExportUrl(currentTenant.id, format, {
      from: toIsoDate(fromDate),
      to: toIsoDate(toDate, true),
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Usage & Cost Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Track tenant usage rollups and estimated spend.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="fromDate" className="text-muted-foreground">
              From
            </label>
            <input
              id="fromDate"
              type="date"
              value={fromDate}
              onChange={event => setFromDate(event.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="toDate" className="text-muted-foreground">
              To
            </label>
            <input
              id="toDate"
              type="date"
              value={toDate}
              onChange={event => setToDate(event.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1"
            />
          </div>
          <Button variant="secondary" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport('json')}>
            <Download className="mr-2 h-4 w-4" /> Export JSON
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Estimated Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">
              {formatCurrency(totalCost)}
            </p>
            <p className="text-sm text-muted-foreground">
              {usageData?.window
                ? `${usageData.window.from.slice(0, 10)} → ${usageData.window.to.slice(0, 10)}`
                : 'Select a date range'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rollups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">
              {usageData?.rollups?.length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">
              Usage summaries returned by the API
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-gray-900">
              {currentTenant?.name ?? 'Unknown tenant'}
            </p>
            <p className="text-sm text-muted-foreground">
              ID: {currentTenant?.id ?? '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading usage data…</div>
      ) : usageTotals.length === 0 ? (
        <EmptyState
          title="No usage data available"
          description="Usage rollups will appear once metering is enabled."
          icon="file"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Dimension</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageTotals}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dimension" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => [
                      `${formatNumber(value)} ${props?.payload?.unit || ''}`,
                      'Total',
                    ]}
                  />
                  <Bar dataKey="total" fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estimated Cost Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={costSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={value => `$${value}`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
