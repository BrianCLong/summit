import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

export type StatusColor = 'green' | 'yellow' | 'red'

export interface BaseStatus {
  status: StatusColor
  details: any
  message?: string
}

interface PanelProps {
  title: string
  data: BaseStatus | null
  loading: boolean
  error?: string
  renderDetails: (details: any) => React.ReactNode
}

const StatusIndicator = ({ status }: { status: StatusColor }) => {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }
  return <div className={`w-3 h-3 rounded-full ${colors[status]}`} />
}

const GenericPanel = ({
  title,
  data,
  loading,
  error,
  renderDetails,
}: PanelProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-500">{title} (Offline)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error || 'No data available'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={
        data.status === 'red'
          ? 'border-red-500'
          : data.status === 'yellow'
            ? 'border-yellow-500'
            : ''
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <StatusIndicator status={data.status} />
      </CardHeader>
      <CardContent>
        {renderDetails(data.details)}
        {data.message && (
          <p className="mt-2 text-xs text-muted-foreground">{data.message}</p>
        )}
      </CardContent>
    </Card>
  )
}

export const GovernancePanel = (
  props: Omit<PanelProps, 'renderDetails' | 'title'>
) => (
  <GenericPanel
    title="Governance"
    {...props}
    renderDetails={details => (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Protected Paths:</span>
          <span className="font-mono">{details.governanceProtectedPaths}</span>
        </div>
        <div className="flex justify-between">
          <span>Kill Switch:</span>
          <span
            className={
              details.killSwitchStatus === 'active'
                ? 'text-red-500 font-bold'
                : 'text-green-500'
            }
          >
            {details.killSwitchStatus}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Last Approval:{' '}
          {new Date(details.lastTier4Approval).toLocaleDateString()}
        </div>
      </div>
    )}
  />
)

export const AgentControlPanel = (
  props: Omit<PanelProps, 'renderDetails' | 'title'>
) => (
  <GenericPanel
    title="Agent Control"
    {...props}
    renderDetails={details => (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Budget Usage:</span>
          <span
            className={
              details.budgetUsagePercent > 80 ? 'text-red-500 font-bold' : ''
            }
          >
            {details.budgetUsagePercent}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Active Agents:</span>
          <span>
            {Object.values(
              details.activeAgents as Record<string, number>
            ).reduce((a: number, b: number) => a + b, 0)}
          </span>
        </div>
        {details.topRiskScores && details.topRiskScores.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold mb-1">Top Risk:</p>
            {details.topRiskScores.map((risk: any) => (
              <div key={risk.agentId} className="flex justify-between text-xs">
                <span>{risk.agentId}</span>
                <span className="font-mono">{risk.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  />
)

export const CIStatusPanel = (
  props: Omit<PanelProps, 'renderDetails' | 'title'>
) => (
  <GenericPanel
    title="CI / PRs"
    {...props}
    renderDetails={details => (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Pass Rate:</span>
          <span>{(details.ciPassRate * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Gov Failures (24h):</span>
          <span
            className={
              details.governanceFailures24h > 0 ? 'text-red-500 font-bold' : ''
            }
          >
            {details.governanceFailures24h}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Open PRs:</span>
          <span>
            {Object.values(details.openPRs as Record<string, number>).reduce(
              (a: number, b: number) => a + b,
              0
            )}
          </span>
        </div>
      </div>
    )}
  />
)

export const ReleasePanel = (
  props: Omit<PanelProps, 'renderDetails' | 'title'>
) => (
  <GenericPanel
    title="Releases"
    {...props}
    renderDetails={details => (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Current Train:</span>
          <Badge variant="outline">{details.currentTrain}</Badge>
        </div>
        <div className="flex justify-between">
          <span>Evidence:</span>
          <span>{(details.evidenceBundleCompleteness * 100).toFixed(0)}%</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 font-mono">
          {details.lastReleaseHash}
        </div>
      </div>
    )}
  />
)

export const ZKIsolationPanel = (
  props: Omit<PanelProps, 'renderDetails' | 'title'>
) => (
  <GenericPanel
    title="ZK & Isolation"
    {...props}
    renderDetails={details => (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Protocol:</span>
          <span>{details.zkProtocolVersion}</span>
        </div>
        <div className="flex justify-between">
          <span>Violations:</span>
          <span
            className={
              details.isolationViolations > 0
                ? 'text-red-500 font-bold'
                : 'text-green-500'
            }
          >
            {details.isolationViolations}
          </span>
        </div>
      </div>
    )}
  />
)

export const StreamingPanel = (
  props: Omit<PanelProps, 'renderDetails' | 'title'>
) => (
  <GenericPanel
    title="Streaming Intel"
    {...props}
    renderDetails={details => (
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Ingestion:</span>
          <span>{details.eventIngestionRate} /s</span>
        </div>
        <div className="flex justify-between">
          <span>Lag:</span>
          <span className={details.streamLagMs > 1000 ? 'text-yellow-500' : ''}>
            {details.streamLagMs} ms
          </span>
        </div>
        <div className="flex justify-between">
          <span>Freshness:</span>
          <span>{details.featureFreshnessMs} ms</span>
        </div>
      </div>
    )}
  />
)

export const GAReadinessPanel = (
  props: Omit<PanelProps, 'renderDetails' | 'title'>
) => (
  <GenericPanel
    title="GA Readiness"
    {...props}
    renderDetails={details => (
      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
        {Object.entries(details.checklist).map(([key, passed]) => (
          <div key={key} className="flex items-center space-x-2">
            <span>{passed ? '✅' : '❌'}</span>
            <span className="capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
        ))}
      </div>
    )}
  />
)
