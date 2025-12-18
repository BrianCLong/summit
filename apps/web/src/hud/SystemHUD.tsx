import React, { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Server,
  Zap,
} from 'lucide-react'
import { useConductorMetrics, useConductorAlerts } from '@/hooks/useConductorMetrics'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'

export function SystemHUD() {
  console.log('SystemHUD rendering...');
  const { metrics, isLoading, error } = useConductorMetrics({
    timeRange: '1h',
    refreshInterval: 15000,
  })
  console.log('SystemHUD metrics:', metrics, 'isLoading:', isLoading, 'error:', error);

  const { unacknowledgedCount } = useConductorAlerts()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading && !metrics) {
    console.log('SystemHUD: loading state');
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground animate-pulse">
        <Activity className="h-4 w-4" />
        <span>System Syncing...</span>
      </div>
    )
  }

  if (error) {
    console.log('SystemHUD: error state', error);
    return (
      <div className="flex items-center space-x-2 text-sm text-red-500">
        <AlertTriangle className="h-4 w-4" />
        <span>System Offline</span>
      </div>
    )
  }

  // Derived metrics
  const latency = metrics?.routing.avgLatency || 0
  const activeJobs = metrics?.routing.totalRequests || 0 // Proxy for jobs
  const activeAgents = metrics?.webOrchestration.activeInterfaces || 0
  const healthScore = metrics?.infrastructure.uptimePercentage || 100

  // Status determination
  const isHealthy = healthScore > 98 && latency < 500
  const isDegraded = !isHealthy && (healthScore > 90 || latency < 1000)
  const isCritical = !isHealthy && !isDegraded

  console.log('SystemHUD: rendering content');
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`
            flex items-center space-x-3 px-3 py-1.5 rounded-full border text-sm transition-all hover:bg-accent
            ${isHealthy ? 'border-green-200 bg-green-50/50 text-green-700' : ''}
            ${isDegraded ? 'border-yellow-200 bg-yellow-50/50 text-yellow-700' : ''}
            ${isCritical ? 'border-red-200 bg-red-50/50 text-red-700' : ''}
          `}
        >
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHealthy ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="font-medium">
              {latency.toFixed(0)}ms
            </span>
          </div>

          <Separator orientation="vertical" className="h-3" />

          <div className="flex items-center space-x-1.5">
            <Zap className="h-3 w-3" />
            <span>{activeJobs}</span>
          </div>

          {unacknowledgedCount > 0 && (
            <>
               <Separator orientation="vertical" className="h-3" />
               <div className="flex items-center space-x-1.5 text-red-600 font-semibold">
                 <AlertTriangle className="h-3 w-3" />
                 <span>{unacknowledgedCount}</span>
               </div>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">System Status</h4>
            <Badge variant={isHealthy ? 'success' : 'destructive'}>
              {isHealthy ? 'Healthy' : 'Degraded'}
            </Badge>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Latency</span>
                <span className={`text-lg font-bold ${latency > 300 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {latency.toFixed(1)}ms
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Uptime</span>
                <span className="text-lg font-bold">
                  {(metrics?.infrastructure.uptimePercentage || 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Active Agents</span>
                <span className="text-lg font-bold">
                  {activeAgents}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Alerts</span>
                <span className={`text-lg font-bold ${unacknowledgedCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {unacknowledgedCount}
                </span>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Server className="h-3 w-3" />
                <span>Last synced: {metrics?.routing ? new Date().toLocaleTimeString() : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
