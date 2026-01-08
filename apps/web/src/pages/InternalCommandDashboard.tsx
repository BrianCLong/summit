import React, { useEffect, useState } from 'react'
import {
  GovernancePanel,
  AgentControlPanel,
  CIStatusPanel,
  ReleasePanel,
  ZKIsolationPanel,
  StreamingPanel,
  GAReadinessPanel,
  BaseStatus,
  StatusColor,
} from '@/components/internal-command/Panels'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'

const InternalCommandDashboard: React.FC = () => {
  const { user } = useAuth()
  const [data, setData] = useState<Record<string, BaseStatus | null>>({
    governance: null,
    agents: null,
    ci: null,
    releases: null,
    zk: null,
    streaming: null,
    ga: null,
  })
  const [loading, setLoading] = useState(true)
  const [globalStatus, setGlobalStatus] = useState<StatusColor>('green')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endpoints = [
          'governance',
          'agents',
          'ci',
          'releases',
          'zk',
          'streaming',
          'ga',
        ]

        const token = localStorage.getItem('auth_token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const results = await Promise.all(
          endpoints.map(async key => {
            try {
              const res = await fetch(`/api/internal/${key}/status`, {
                headers,
              })
              if (!res.ok) throw new Error(`Failed to fetch ${key}`)
              return { key, data: await res.json() }
            } catch (e) {
              console.error(e)
              return { key, data: null } // Fail closed
            }
          })
        )

        const newData: Record<string, BaseStatus | null> = {}
        let worstStatus: StatusColor = 'green'
        const priority = { red: 3, yellow: 2, green: 1 }

        results.forEach(({ key, data }) => {
          newData[key] = data
          if (data) {
            if (priority[data.status as StatusColor] > priority[worstStatus]) {
              worstStatus = data.status
            }
          }
        })

        setData(newData)
        setGlobalStatus(worstStatus)
      } catch (e) {
        console.error('Global fetch error', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const bannerColor = {
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
  }[globalStatus]

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* Global Status Banner */}
      <div
        className={`rounded-lg ${bannerColor} p-4 text-white shadow-md flex items-center justify-between`}
      >
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold tracking-tight">
            SUMMIT COMMAND DASHBOARD
          </h1>
          <Badge
            variant="outline"
            className="bg-white/20 text-white border-none"
          >
            Status: {globalStatus.toUpperCase()}
          </Badge>
        </div>
        <div className="font-mono text-sm opacity-90">
          Release: stable@a1b2c3
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Row 1 */}
        <GovernancePanel data={data.governance} loading={loading} />
        <AgentControlPanel data={data.agents} loading={loading} />
        <CIStatusPanel data={data.ci} loading={loading} />

        {/* Row 2 */}
        <ReleasePanel data={data.releases} loading={loading} />
        <ZKIsolationPanel data={data.zk} loading={loading} />
        <StreamingPanel data={data.streaming} loading={loading} />
      </div>

      {/* Row 3 - GA Readiness (Full Width) */}
      <div className="grid grid-cols-1">
        <GAReadinessPanel data={data.ga} loading={loading} />
      </div>
    </div>
  )
}

export default InternalCommandDashboard
