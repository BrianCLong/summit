import React from 'react'
import {
  GovernancePanel,
  AgentControlPanel,
  CIStatusPanel,
  ReleasePanel,
  ZKIsolationPanel,
  StreamingPanel,
  GAReadinessPanel,
} from '@/features/internal-command/components/Panels'
import { useCommandStatus } from '@/features/internal-command/useCommandStatus'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default function InternalCommandDashboard() {
  const { state, refresh } = useCommandStatus()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              Summit Internal Command Dashboard
            </h1>
            <Badge variant="secondary">Read-only</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Single source of operational truth for leadership. All panels fail
            closed; evidence links route to canonical artifacts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              state.banner.level === 'red'
                ? 'destructive'
                : state.banner.level === 'yellow'
                  ? 'warning'
                  : 'success'
            }
          >
            {state.banner.level === 'green'
              ? '🟢 Nominal'
              : state.banner.level === 'yellow'
                ? '🟡 At risk'
                : '🔴 Critical'}
          </Badge>
          <Button variant="outline" onClick={refresh}>
            Force refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <GovernancePanel />
        <AgentControlPanel />
        <CIStatusPanel />
        <ReleasePanel />
        <ZKIsolationPanel />
        <StreamingPanel />
        <GAReadinessPanel />
      </div>
    </div>
  )
}
