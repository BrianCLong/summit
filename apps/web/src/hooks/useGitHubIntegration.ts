// apps/web/src/hooks/useGitHubIntegration.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

interface GitHubMetrics {
  repository: {
    name: string
    fullName: string
    private: boolean
    defaultBranch: string
    language: string
  }
  pullRequests: {
    open: number
    merged: number
    closed: number
    avgTimeToMerge: number
    recentPRs: Array<{
      number: number
      title: string
      author: string
      state: 'open' | 'closed' | 'merged'
      createdAt: string
      updatedAt: string
      mergeable: boolean
      draft: boolean
      reviewStatus: 'approved' | 'changes_requested' | 'pending' | 'none'
      ciStatus: 'success' | 'failure' | 'pending' | 'none'
      labels: string[]
    }>
  }
  commits: {
    totalCount: number
    recentCommits: Array<{
      sha: string
      message: string
      author: {
        name: string
        email: string
        avatarUrl?: string
      }
      timestamp: string
      status: 'success' | 'pending' | 'failure'
      checkRuns: Array<{
        name: string
        status: string
        conclusion: string
      }>
      filesChanged: number
      additions: number
      deletions: number
    }>
  }
  codeQuality: {
    testCoverage: number
    codeQualityScore: number
    technicalDebt: number
    vulnerabilities: {
      critical: number
      high: number
      medium: number
      low: number
    }
    linesOfCode: number
    codeComplexity: number
  }
  deployments: {
    totalDeployments: number
    successRate: number
    avgDeploymentTime: number
    deploymentFrequency: number
    meanTimeToRecovery: number
    recentDeployments: Array<{
      id: string
      environment: string
      status: 'success' | 'failure' | 'pending'
      createdAt: string
      deployedBy: string
      commitSha: string
      duration: number
    }>
  }
  issues: {
    open: number
    closed: number
    avgTimeToClose: number
    recentIssues: Array<{
      number: number
      title: string
      state: 'open' | 'closed'
      assignee?: string
      labels: string[]
      createdAt: string
      updatedAt: string
      priority: 'low' | 'medium' | 'high' | 'critical'
    }>
  }
}

interface UseGitHubIntegrationOptions {
  repository?: string
  refreshInterval?: number
  includePrivateRepos?: boolean
}

export const useGitHubIntegration = (
  options: UseGitHubIntegrationOptions = {}
) => {
  const {
    repository = process.env.NEXT_PUBLIC_GITHUB_REPO,
    refreshInterval = 60000,
  } = options
  const queryClient = useQueryClient()

  const fetchGitHubMetrics = async (): Promise<GitHubMetrics> => {
    const response = await fetch(
      `/api/integrations/github/metrics?repo=${repository}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    return response.json()
  }

  const githubQuery = useQuery({
    queryKey: ['github-metrics', repository],
    queryFn: fetchGitHubMetrics,
    refetchInterval: refreshInterval,
    staleTime: 30000,
    retry: 2,
    retryDelay: 5000,
  })

  return {
    data: githubQuery.data,
    loading: githubQuery.isLoading,
    error: githubQuery.error,
    refetch: githubQuery.refetch,
  }
}

// Hook for GitHub actions/workflows
export const useGitHubWorkflows = (repository: string) => {
  return useQuery({
    queryKey: ['github-workflows', repository],
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/github/workflows?repo=${repository}`
      )
      return response.json()
    },
    refetchInterval: 120000, // 2 minutes
    staleTime: 60000,
  })
}

// Hook for creating GitHub issues from conductor
export const useCreateGitHubIssue = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (issue: {
      title: string
      body: string
      labels?: string[]
      assignees?: string[]
      repository: string
    }) => {
      const response = await fetch('/api/integrations/github/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue),
      })

      if (!response.ok) {
        throw new Error('Failed to create GitHub issue')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch GitHub metrics
      queryClient.invalidateQueries({
        queryKey: ['github-metrics', variables.repository],
      })
    },
  })
}

// Hook for GitHub code scanning alerts
export const useGitHubCodeScanning = (repository: string) => {
  return useQuery({
    queryKey: ['github-code-scanning', repository],
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/github/code-scanning?repo=${repository}`
      )
      return response.json()
    },
    refetchInterval: 300000, // 5 minutes
    staleTime: 180000, // 3 minutes
  })
}

// Hook for GitHub Dependabot alerts
export const useGitHubDependabot = (repository: string) => {
  return useQuery({
    queryKey: ['github-dependabot', repository],
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/github/dependabot?repo=${repository}`
      )
      return response.json()
    },
    refetchInterval: 3600000, // 1 hour
    staleTime: 1800000, // 30 minutes
  })
}

// Real-time GitHub webhooks hook
export const useGitHubWebhooks = (repository: string) => {
  const [webhookEvents, setWebhookEvents] = useState<
    Array<{
      id: string
      event: string
      action: string
      payload: any
      timestamp: Date
    }>
  >([])

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/integrations/github/webhooks/stream?repo=${repository}`
    )

    eventSource.onmessage = event => {
      try {
        const webhookEvent = JSON.parse(event.data)
        setWebhookEvents(prev => [webhookEvent, ...prev].slice(0, 100)) // Keep last 100 events
      } catch (error) {
        console.error('Failed to parse webhook event:', error)
      }
    }

    eventSource.onerror = error => {
      console.error('GitHub webhooks SSE error:', error)
    }

    return () => eventSource.close()
  }, [repository])

  return {
    webhookEvents,
    latestEvent: webhookEvents[0],
  }
}

// Hook for GitHub repository insights
export const useGitHubInsights = (
  repository: string,
  timeRange: string = '30d'
) => {
  return useQuery({
    queryKey: ['github-insights', repository, timeRange],
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/github/insights?repo=${repository}&timeRange=${timeRange}`
      )
      return response.json()
    },
    refetchInterval: 3600000, // 1 hour
    staleTime: 1800000, // 30 minutes
  })
}

// Hook for GitHub branch protection rules
export const useGitHubBranchProtection = (repository: string) => {
  return useQuery({
    queryKey: ['github-branch-protection', repository],
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/github/branch-protection?repo=${repository}`
      )
      return response.json()
    },
    staleTime: 3600000, // 1 hour - branch protection doesn't change often
    refetchOnWindowFocus: false,
  })
}

// Hook for triggering GitHub Actions workflows
export const useTriggerGitHubWorkflow = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      repository: string
      workflowId: string
      ref?: string
      inputs?: Record<string, any>
    }) => {
      const response = await fetch(
        '/api/integrations/github/workflows/dispatch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to trigger GitHub workflow')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Refresh workflows data
      queryClient.invalidateQueries({
        queryKey: ['github-workflows', variables.repository],
      })
    },
  })
}

// Hook for GitHub repository statistics
export const useGitHubStats = (repository: string) => {
  return useQuery({
    queryKey: ['github-stats', repository],
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/github/stats?repo=${repository}`
      )
      return response.json()
    },
    refetchInterval: 21600000, // 6 hours
    staleTime: 10800000, // 3 hours
  })
}

// Hook for creating GitHub Pull Requests from the UI
export interface CreatePullRequestInput {
  title: string
  body: string
  head: string
  base?: string
  draft?: boolean
  labels?: string[]
  assignees?: string[]
  repository: string
}

export interface PullRequestResult {
  number: number
  url: string
  htmlUrl: string
  state: string
  title: string
  draft: boolean
  mergeable: boolean | null
  createdAt: string
}

export const useCreatePullRequest = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      pr: CreatePullRequestInput
    ): Promise<PullRequestResult> => {
      const response = await fetch('/api/integrations/github/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pr.title,
          body: pr.body,
          head: pr.head,
          base: pr.base || 'main',
          draft: pr.draft || false,
          labels: pr.labels || [],
          assignees: pr.assignees || [],
          targetRepo: pr.repository,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to create pull request')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch GitHub metrics
      queryClient.invalidateQueries({
        queryKey: ['github-metrics', variables.repository],
      })
    },
  })
}

// Hook for listing branches
export const useGitHubBranches = (repository: string) => {
  return useQuery({
    queryKey: ['github-branches', repository],
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/github/branches?repo=${repository}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch branches')
      }
      return response.json() as Promise<
        Array<{ name: string; protected: boolean }>
      >
    },
    staleTime: 60000, // 1 minute
  })
}
