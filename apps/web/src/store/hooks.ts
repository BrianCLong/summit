import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { RootState, AppDispatch } from './index'

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Conductor-specific hooks for Phase 2A Dashboard

interface ConductorMetrics {
  routing: {
    totalRequests: number
    successRate: number
    avgLatency: number
    expertDistribution: Record<string, number>
    qualityGatesPassed: number
    costEfficiency: number
    timeSeriesData: Array<{
      timestamp: string
      requests: number
      latency: number
      success_rate: number
    }>
  }
  webOrchestration: {
    activeInterfaces: number
    synthesisQuality: number
    complianceScore: number
    citationCoverage: number
    contradictionRate: number
  }
  premiumModels: {
    utilizationRate: number
    costSavings: number
    qualityImprovement: number
    modelDistribution: Record<string, number>
    thomsonSamplingConvergence: number
  }
  infrastructure: {
    uptimePercentage: number
    scalingEvents: number
    alertsActive: number
    budgetUtilization: number
  }
}

interface GitHubMetrics {
  openPRs: number
  codeQualityScore: number
  testCoverage: number
  deploymentFrequency: number
  meanTimeToRecovery: number
  recentCommits: Array<{
    sha: string
    message: string
    author: string
    timestamp: string
    status: 'success' | 'pending' | 'failure'
  }>
}

interface JIRAMetrics {
  openIssues: number
  inProgressIssues: number
  resolvedThisWeek: number
  avgResolutionTime: number
  priorityDistribution: Record<string, number>
  recentIssues: Array<{
    key: string
    summary: string
    status: string
    assignee: string
    priority: string
    created: string
  }>
}

export const useConductorMetrics = (options: {
  timeRange: '1h' | '24h' | '7d' | '30d'
  refreshInterval: number
}) => {
  const [data, setData] = useState<ConductorMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refreshIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)

      // Simulate API call with realistic conductor metrics
      await new Promise(resolve => setTimeout(resolve, 300))

      const mockMetrics: ConductorMetrics = {
        routing: {
          totalRequests: Math.floor(Math.random() * 5000) + 8000,
          successRate: 96 + Math.random() * 3,
          avgLatency: 42 + Math.random() * 35,
          expertDistribution: {
            'Web Orchestration': 38 + Math.random() * 8,
            'Premium Models': 28 + Math.random() * 8,
            'Code Generation': 16 + Math.random() * 6,
            'Data Analysis': 12 + Math.random() * 4,
            'Research Synthesis': 6 + Math.random() * 4,
          },
          qualityGatesPassed: Math.floor(Math.random() * 500) + 7500,
          costEfficiency: 82 + Math.random() * 15,
          timeSeriesData: generateTimeSeriesData(),
        },
        webOrchestration: {
          activeInterfaces: Math.floor(Math.random() * 3) + 10,
          synthesisQuality: 89 + Math.random() * 8,
          complianceScore: 96 + Math.random() * 3,
          citationCoverage: 91 + Math.random() * 7,
          contradictionRate: Math.random() * 4,
        },
        premiumModels: {
          utilizationRate: 74 + Math.random() * 20,
          costSavings: Math.floor(Math.random() * 1500) + 1200,
          qualityImprovement: 18 + Math.random() * 12,
          modelDistribution: {
            'GPT-4 Turbo': 42 + Math.random() * 8,
            'Claude 3 Sonnet': 31 + Math.random() * 8,
            'GPT-3.5 Turbo': 15 + Math.random() * 5,
            'Gemini Pro': 8 + Math.random() * 4,
            Other: 4 + Math.random() * 3,
          },
          thomsonSamplingConvergence: 84 + Math.random() * 12,
        },
        infrastructure: {
          uptimePercentage: 99.8 + Math.random() * 0.19,
          scalingEvents: Math.floor(Math.random() * 4),
          alertsActive: Math.floor(Math.random() * 2),
          budgetUtilization: 67 + Math.random() * 15,
        },
      }

      setData(mockMetrics)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()

    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    refreshIntervalRef.current = setInterval(
      fetchMetrics,
      options.refreshInterval
    )

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [fetchMetrics, options.refreshInterval])

  return { data, loading, error, refetch: fetchMetrics, lastUpdated }
}

export const useGitHubIntegration = (options: { refreshInterval: number }) => {
  const [data, setData] = useState<GitHubMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchGitHubData = useCallback(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 400))

      const mockGitHubData: GitHubMetrics = {
        openPRs: Math.floor(Math.random() * 8) + 3,
        codeQualityScore: 89 + Math.random() * 8,
        testCoverage: 82 + Math.random() * 12,
        deploymentFrequency: Math.floor(Math.random() * 5) + 12,
        meanTimeToRecovery: 2 + Math.random() * 4,
        recentCommits: [
          {
            sha: '7c3f2a1b',
            message:
              'feat(conductor): enhance web orchestration with Thompson sampling',
            author: 'alex.dev',
            timestamp: '2 hours ago',
            status: 'success',
          },
          {
            sha: '9e4b5c2d',
            message:
              'fix(compliance): improve robots.txt validation performance',
            author: 'jordan.backend',
            timestamp: '4 hours ago',
            status: 'success',
          },
          {
            sha: '1a2b3c4d',
            message: 'test: add premium model router integration tests',
            author: 'casey.qa',
            timestamp: '6 hours ago',
            status: 'pending',
          },
        ],
      }

      setData(mockGitHubData)
    } catch (err) {
      console.error('GitHub fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGitHubData()
    const interval = setInterval(fetchGitHubData, options.refreshInterval)
    return () => clearInterval(interval)
  }, [fetchGitHubData, options.refreshInterval])

  return { data, loading }
}

export const useJIRAIntegration = (options: { refreshInterval: number }) => {
  const [data, setData] = useState<JIRAMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchJIRAData = useCallback(async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))

      const mockJIRAData: JIRAMetrics = {
        openIssues: Math.floor(Math.random() * 12) + 8,
        inProgressIssues: Math.floor(Math.random() * 6) + 4,
        resolvedThisWeek: Math.floor(Math.random() * 15) + 18,
        avgResolutionTime: 2 + Math.random() * 3,
        priorityDistribution: {
          High: 15 + Math.random() * 10,
          Medium: 45 + Math.random() * 15,
          Low: 35 + Math.random() * 10,
          Critical: 5 + Math.random() * 5,
        },
        recentIssues: [
          {
            key: 'COND-247',
            summary:
              'Optimize Thompson Sampling convergence for premium models',
            status: 'In Progress',
            assignee: 'alex.dev',
            priority: 'High',
            created: '2024-08-31',
          },
          {
            key: 'COND-246',
            summary: 'Add rate limiting monitoring dashboards',
            status: 'To Do',
            assignee: 'morgan.devops',
            priority: 'Medium',
            created: '2024-08-30',
          },
          {
            key: 'COND-245',
            summary: 'Improve web orchestration citation extraction accuracy',
            status: 'Code Review',
            assignee: 'jordan.backend',
            priority: 'Medium',
            created: '2024-08-29',
          },
        ],
      }

      setData(mockJIRAData)
    } catch (err) {
      console.error('JIRA fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJIRAData()
    const interval = setInterval(fetchJIRAData, options.refreshInterval)
    return () => clearInterval(interval)
  }, [fetchJIRAData, options.refreshInterval])

  return { data, loading }
}

function generateTimeSeriesData() {
  const now = new Date()
  const data = []

  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      timestamp: timestamp.toISOString(),
      requests: Math.floor(Math.random() * 150) + 75,
      latency: Math.floor(Math.random() * 80) + 40,
      success_rate: 0.96 + Math.random() * 0.03,
    })
  }

  return data
}
