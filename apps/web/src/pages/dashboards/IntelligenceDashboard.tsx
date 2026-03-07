import React, { useState } from 'react'
import {
  useIntelligenceSocket,
  IntelligenceItem,
  IntelligenceAlert,
} from '../../hooks/useIntelligenceSocket'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card' // Assuming these exist
import { Badge } from '../../components/ui/Badge' // Assuming these exist
import { Button } from '../../components/ui/Button' // Assuming these exist
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  Activity,
  Shield,
  Globe,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const IntelligenceDashboard = () => {
  const [targetId, setTargetId] = useState('global')
  const { items, alerts, isConnected } = useIntelligenceSocket(targetId)

  // Calculate metrics
  const highThreatCount = items.filter(i => i.threatScore > 0.8).length
  const recentAlertsCount = alerts.length

  // Chart data preparation (mock aggregate)
  const chartData = items
    .slice(0, 20)
    .reverse()
    .map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString(),
      threatScore: item.threatScore * 100,
    }))

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Summit Intelligence Monitor
          </h1>
          <p className="text-slate-500">
            Real-time OSINT & Threat Detection System
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-white rounded-full border shadow-sm">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? 'Live Stream Active' : 'Disconnected'}
            </span>
          </div>
          <select
            className="px-3 py-2 border rounded-md bg-white"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
          >
            <option value="global">Global View</option>
            <option value="target-alpha">Target Alpha</option>
            <option value="target-bravo">Target Bravo</option>
            <option value="op-morozko">Op Morozko</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Threats
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highThreatCount}</div>
            <p className="text-xs text-muted-foreground">
              High priority items detected
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAlertsCount}</div>
            <p className="text-xs text-muted-foreground">
              Generated in last session
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Live Feed Volume
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">Items processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sources
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Social, Darkweb, News, Signal
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Feed */}
        <Card className="col-span-4 h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle>Live Intelligence Feed</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto space-y-4">
            {items.map(item => (
              <div
                key={item.id}
                className="flex flex-col p-4 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        item.type === 'darkweb'
                          ? 'destructive'
                          : item.type === 'social'
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {item.type}
                    </Badge>
                    <span className="text-xs font-mono text-slate-500">
                      {item.source}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mb-2">{item.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500">
                      Threat Score:
                    </span>
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.threatScore > 0.8 ? 'bg-red-500' : item.threatScore > 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${item.threatScore * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                Waiting for intelligence stream...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts & Charts */}
        <div className="col-span-3 space-y-6">
          <Card className="h-[300px]">
            <CardHeader>
              <CardTitle>Threat Velocity</CardTitle>
            </CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="threatScore"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="h-[276px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-3 border border-red-100 bg-red-50 rounded-md"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-semibold text-red-800">
                      {alert.title}
                    </h4>
                    <span className="text-xs text-red-600">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    {alert.description}
                  </p>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  No active alerts
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default IntelligenceDashboard
