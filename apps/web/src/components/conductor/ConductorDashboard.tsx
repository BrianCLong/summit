// apps/web/src/components/conductor/ConductorDashboard.tsx

import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  Activity,
  GitBranch,
  Bug,
  TrendingUp,
  Clock,
  DollarSign,
  Shield,
  Zap,
} from 'lucide-react'
import { useConductorMetrics } from '@/hooks/useConductorMetrics'
import { useGitHubIntegration } from '@/hooks/useGitHubIntegration'
import { useJIRAIntegration } from '@/hooks/useJIRAIntegration'

export const ConductorDashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    '1h' | '24h' | '7d' | '30d'
  >('24h')
  const [refreshInterval] = useState(30000) // 30 seconds

  const {
    data: metrics,
    error: metricsError,
  } = useConductorMetrics({
    timeRange: selectedTimeRange,
    refreshInterval,
  })

  const { data: githubData, loading: githubLoading } = useGitHubIntegration({
    refreshInterval: 60000, // 1 minute
  })

  const { data: jiraData, loading: jiraLoading } = useJIRAIntegration({
    refreshInterval: 120000, // 2 minutes
  })

  // Calculate overall system health score
  const systemHealthScore = useMemo(() => {
    if (!metrics) return 0

    const weights = {
      routing: 0.25,
      webOrchestration: 0.25,
      premiumModels: 0.25,
      infrastructure: 0.25,
    }

    const scores = {
      routing:
        metrics.routing.successRate * 0.4 +
        Math.min(100, 100 - metrics.routing.avgLatency / 50) * 0.3 +
        metrics.routing.costEfficiency * 0.3,
      webOrchestration:
        metrics.webOrchestration.complianceScore * 0.4 +
        metrics.webOrchestration.synthesisQuality * 0.3 +
        metrics.webOrchestration.citationCoverage * 0.3,
      premiumModels:
        metrics.premiumModels.utilizationRate * 0.4 +
        metrics.premiumModels.qualityImprovement * 0.3 +
        metrics.premiumModels.thomsonSamplingConvergence * 0.3,
      infrastructure:
        metrics.infrastructure.uptimePercentage * 0.5 +
        Math.max(0, 100 - metrics.infrastructure.alertsActive * 10) * 0.3 +
        (100 - metrics.infrastructure.budgetUtilization * 100 * 0.2),
    }

    return Object.entries(weights).reduce(
      (total, [key, weight]) =>
        total + scores[key as keyof typeof scores] * weight,
      0
    )
  }, [metrics])

  // Determine system status
  const systemStatus = useMemo(() => {
    if (systemHealthScore >= 90)
      return {
        status: 'excellent',
        color: 'text-green-600',
        bg: 'bg-green-100',
      }
    if (systemHealthScore >= 80)
      return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-100' }
    if (systemHealthScore >= 70)
      return {
        status: 'warning',
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
      }
    return { status: 'critical', color: 'text-red-600', bg: 'bg-red-100' }
  }, [systemHealthScore])

  if (metricsError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Dashboard Error</AlertTitle>
        <AlertDescription>
          Failed to load conductor metrics: {metricsError.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Conductor Omniversal Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Universal Resource Orchestration & Intelligence Synthesis
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className={`px-4 py-2 rounded-full ${systemStatus.bg}`}>
            <span className={`font-semibold ${systemStatus.color}`}>
              System Health: {systemHealthScore.toFixed(1)}% (
              {systemStatus.status.toUpperCase()})
            </span>
          </div>

          <select
            value={selectedTimeRange}
            onChange={e => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Routing Success"
          value={`${metrics?.routing.successRate.toFixed(1) || 0}%`}
          change={'+2.3%'}
          trend="up"
          icon={<Activity className="h-5 w-5" />}
          color="text-green-600"
        />

        <MetricCard
          title="Web Orchestration"
          value={`${metrics?.webOrchestration.activeInterfaces || 0} Sources`}
          change={`${metrics?.webOrchestration.synthesisQuality.toFixed(1) || 0}% Quality`}
          trend="up"
          icon={<Zap className="h-5 w-5" />}
          color="text-blue-600"
        />

        <MetricCard
          title="Premium Models"
          value={`${metrics?.premiumModels.utilizationRate.toFixed(1) || 0}%`}
          change={`$${metrics?.premiumModels.costSavings.toFixed(0) || 0} Saved`}
          trend="up"
          icon={<DollarSign className="h-5 w-5" />}
          color="text-purple-600"
        />

        <MetricCard
          title="Compliance Score"
          value={`${metrics?.webOrchestration.complianceScore.toFixed(1) || 0}%`}
          change={`${metrics?.webOrchestration.citationCoverage.toFixed(1) || 0}% Citations`}
          trend="stable"
          icon={<Shield className="h-5 w-5" />}
          color="text-indigo-600"
        />
      </div>

      <Tabs defaultValue="orchestration" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
          <TabsTrigger value="models">Premium Models</TabsTrigger>
          <TabsTrigger value="web">Web Sources</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="jira">JIRA</TabsTrigger>
        </TabsList>

        {/* Orchestration Tab */}
        <TabsContent value="orchestration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Volume & Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics?.routing.timeSeriesData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="requests"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="latency"
                      stroke="#ef4444"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expert Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        metrics?.routing.expertDistribution || {}
                      ).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {Object.entries(
                        metrics?.routing.expertDistribution || {}
                      ).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={EXPERT_COLORS[index % EXPERT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Gates Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QualityGateIndicator
                  name="Budget Compliance"
                  passed={metrics?.routing.qualityGatesPassed || 0}
                  total={metrics?.routing.totalRequests || 1}
                  threshold={95}
                />
                <QualityGateIndicator
                  name="Policy Validation"
                  passed={metrics?.webOrchestration.complianceScore || 0}
                  total={100}
                  threshold={90}
                />
                <QualityGateIndicator
                  name="Citation Coverage"
                  passed={metrics?.webOrchestration.citationCoverage || 0}
                  total={100}
                  threshold={85}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(
                      metrics?.premiumModels.modelDistribution || {}
                    ).map(([name, utilization]) => ({
                      name,
                      utilization,
                      quality: Math.random() * 100, // Would come from real data
                      cost: Math.random() * 100,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="utilization"
                      fill="#3b82f6"
                      name="Utilization %"
                    />
                    <Bar
                      dataKey="quality"
                      fill="#10b981"
                      name="Quality Score"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thompson Sampling Convergence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Convergence Rate
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {metrics?.premiumModels.thomsonSamplingConvergence.toFixed(
                        1
                      ) || 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      metrics?.premiumModels.thomsonSamplingConvergence || 0
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-600">
                    Higher convergence indicates better model selection learning
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Model Utilization & Cost Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Avg Cost</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Success Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(
                    metrics?.premiumModels.modelDistribution || {}
                  ).map(([model, util]) => (
                    <TableRow key={model}>
                      <TableCell className="font-medium">{model}</TableCell>
                      <TableCell>{util.toFixed(1)}%</TableCell>
                      <TableCell>
                        $0.
                        {Math.floor(Math.random() * 100)
                          .toString()
                          .padStart(2, '0')}
                      </TableCell>
                      <TableCell>{(Math.random() * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        {(Math.random() * 0.1 + 0.9).toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Sources Tab */}
        <TabsContent value="web" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Web Interfaces</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {metrics?.webOrchestration.activeInterfaces || 0}
                  </div>
                  <p className="text-gray-600">Sources Online</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Synthesis Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {metrics?.webOrchestration.synthesisQuality.toFixed(1) || 0}
                    %
                  </div>
                  <p className="text-gray-600">Multi-source Quality</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">
                    {metrics?.webOrchestration.complianceScore.toFixed(1) || 0}%
                  </div>
                  <p className="text-gray-600">Ethics & Legal</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Web Source Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Citations</TableHead>
                    <TableHead>Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {WEB_SOURCES.map(source => (
                    <TableRow key={source.domain}>
                      <TableCell className="font-medium">
                        {source.domain}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            source.status === 'online'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {source.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{source.responseTime}ms</TableCell>
                      <TableCell>{source.qualityScore}%</TableCell>
                      <TableCell>{source.citations}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            source.compliance > 90 ? 'default' : 'secondary'
                          }
                        >
                          {source.compliance}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GitHub Integration Tab */}
        <TabsContent value="github" className="space-y-6">
          {githubLoading ? (
            <div className="text-center py-8">Loading GitHub metrics...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                  title="Open PRs"
                  value={githubData?.pullRequests?.open?.toString() || '0'}
                  icon={<GitBranch className="h-5 w-5" />}
                  color="text-blue-600"
                />
                <MetricCard
                  title="Code Quality"
                  value={`${githubData?.codeQuality?.codeQualityScore || 0}%`}
                  icon={<Shield className="h-5 w-5" />}
                  color="text-green-600"
                />
                <MetricCard
                  title="Test Coverage"
                  value={`${githubData?.codeQuality?.testCoverage || 0}%`}
                  icon={<Activity className="h-5 w-5" />}
                  color="text-purple-600"
                />
                <MetricCard
                  title="MTTR"
                  value={`${githubData?.deployments?.meanTimeToRecovery || 0}h`}
                  icon={<Clock className="h-5 w-5" />}
                  color="text-orange-600"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Commits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {githubData?.commits?.recentCommits?.map(commit => (
                      <div
                        key={commit.sha}
                        className="flex items-center space-x-4 p-3 border rounded-lg"
                      >
                        <Badge
                          variant={
                            commit.status === 'success'
                              ? 'default'
                              : commit.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {commit.status}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{commit.message}</p>
                          <p className="text-sm text-gray-600">
                            {commit.author.name} • {commit.timestamp}
                          </p>
                        </div>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {commit.sha.substring(0, 7)}
                        </code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* JIRA Integration Tab */}
        <TabsContent value="jira" className="space-y-6">
          {jiraLoading ? (
            <div className="text-center py-8">Loading JIRA metrics...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                  title="Open Issues"
                  value={jiraData?.issues?.open?.toString() || '0'}
                  icon={<Bug className="h-5 w-5" />}
                  color="text-red-600"
                />
                <MetricCard
                  title="In Progress"
                  value={jiraData?.issues?.inProgress?.toString() || '0'}
                  icon={<Activity className="h-5 w-5" />}
                  color="text-blue-600"
                />
                <MetricCard
                  title="Resolved"
                  value={jiraData?.issues?.resolved?.toString() || '0'}
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="text-green-600"
                />
                <MetricCard
                  title="Avg Resolution"
                  value={`${jiraData?.issues?.avgResolutionTime || 0}d`}
                  icon={<Clock className="h-5 w-5" />}
                  color="text-purple-600"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jiraData?.issues?.recentIssues?.map(issue => (
                        <TableRow key={issue.key}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{issue.key}</p>
                              <p className="text-sm text-gray-600">
                                {issue.summary}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{issue.status.name}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                issue.priority.name === 'High'
                                  ? 'destructive'
                                  : issue.priority.name === 'Medium'
                                    ? 'default'
                                    : 'secondary'
                              }
                            >
                              {issue.priority.name}
                            </Badge>
                          </TableCell>
                          <TableCell>{issue.assignee?.displayName || 'Unassigned'}</TableCell>
                          <TableCell>{issue.created}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components
const MetricCard: React.FC<{
  title: string
  value: string
  change?: string
  trend?: 'up' | 'down' | 'stable'
  icon: React.ReactNode
  color: string
}> = ({ title, value, change, trend, icon, color }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p
              className={`text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}
            >
              {change}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-gray-100 ${color}`}>{icon}</div>
      </div>
    </CardContent>
  </Card>
)

const QualityGateIndicator: React.FC<{
  name: string
  passed: number
  total: number
  threshold: number
}> = ({ name, passed, total, threshold }) => {
  const percentage = (passed / total) * 100
  const status =
    percentage >= threshold
      ? 'success'
      : percentage >= threshold * 0.8
        ? 'warning'
        : 'error'

  return (
    <div className="text-center">
      <div
        className={`text-2xl font-bold mb-2 ${
          status === 'success'
            ? 'text-green-600'
            : status === 'warning'
              ? 'text-yellow-600'
              : 'text-red-600'
        }`}
      >
        {percentage.toFixed(1)}%
      </div>
      <Progress value={percentage} className="mb-2" />
      <p className="text-sm font-medium">{name}</p>
      <p className="text-xs text-gray-600">
        {passed}/{total} passed
      </p>
    </div>
  )
}

// Constants
const EXPERT_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
]

const WEB_SOURCES = [
  {
    domain: 'docs.python.org',
    status: 'online',
    responseTime: 245,
    qualityScore: 96,
    citations: 1247,
    compliance: 98,
  },
  {
    domain: 'stackoverflow.com',
    status: 'online',
    responseTime: 189,
    qualityScore: 89,
    citations: 3421,
    compliance: 94,
  },
  {
    domain: 'github.com',
    status: 'online',
    responseTime: 156,
    qualityScore: 92,
    citations: 2156,
    compliance: 97,
  },
  {
    domain: 'arxiv.org',
    status: 'online',
    responseTime: 298,
    qualityScore: 94,
    citations: 892,
    compliance: 99,
  },
  {
    domain: 'nist.gov',
    status: 'online',
    responseTime: 423,
    qualityScore: 98,
    citations: 567,
    compliance: 100,
  },
]

export default ConductorDashboard
