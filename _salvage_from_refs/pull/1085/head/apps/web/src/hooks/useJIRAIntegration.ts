// apps/web/src/hooks/useJIRAIntegration.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface JIRAMetrics {
  project: {
    key: string;
    name: string;
    projectType: string;
    lead: string;
    issueTypes: Array<{
      id: string;
      name: string;
      iconUrl: string;
    }>;
  };
  issues: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    backlog: number;
    avgResolutionTime: number;
    avgResponseTime: number;
    recentIssues: Array<{
      key: string;
      summary: string;
      description?: string;
      status: {
        name: string;
        category: 'TO DO' | 'IN PROGRESS' | 'DONE';
        colorName: string;
      };
      priority: {
        name: string;
        iconUrl: string;
      };
      issueType: {
        name: string;
        iconUrl: string;
      };
      assignee?: {
        displayName: string;
        emailAddress: string;
        avatarUrls: Record<string, string>;
      };
      reporter: {
        displayName: string;
        emailAddress: string;
      };
      created: string;
      updated: string;
      resolutionDate?: string;
      labels: string[];
      components: Array<{
        name: string;
      }>;
      fixVersions: Array<{
        name: string;
        releaseDate?: string;
      }>;
    }>;
  };
  sprints: {
    active: Array<{
      id: number;
      name: string;
      state: 'ACTIVE' | 'CLOSED' | 'FUTURE';
      startDate: string;
      endDate: string;
      completeDate?: string;
      goal?: string;
      issuesCount: number;
      completedIssues: number;
      burndownData: Array<{
        date: string;
        remainingWork: number;
        idealWork: number;
      }>;
    }>;
    velocity: Array<{
      sprintName: string;
      committed: number;
      completed: number;
      velocityPoints: number;
    }>;
  };
  performance: {
    throughput: Array<{
      date: string;
      issuesCompleted: number;
      storyPointsCompleted: number;
    }>;
    cycleTime: {
      average: number;
      percentile50: number;
      percentile95: number;
    };
    leadTime: {
      average: number;
      percentile50: number;
      percentile95: number;
    };
    blockedTime: {
      average: number;
      percentage: number;
    };
  };
  quality: {
    defectRate: number;
    reopenRate: number;
    escapedDefects: number;
    techDebtIssues: number;
    codeReviewCoverage: number;
  };
}

interface UseJIRAIntegrationOptions {
  projectKey?: string;
  refreshInterval?: number;
  includeClosedSprints?: boolean;
  maxResults?: number;
}

export const useJIRAIntegration = (options: UseJIRAIntegrationOptions = {}) => {
  const { 
    projectKey = process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY,
    refreshInterval = 120000, // 2 minutes
    maxResults = 50
  } = options;

  const fetchJIRAMetrics = async (): Promise<JIRAMetrics> => {
    const params = new URLSearchParams({
      projectKey: projectKey || '',
      maxResults: maxResults.toString()
    });

    const response = await fetch(`/api/integrations/jira/metrics?${params}`, {
      headers: {
        'Authorization': `Bearer ${process.env.JIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`JIRA API error: ${response.statusText}`);
    }

    return response.json();
  };

  const jiraQuery = useQuery({
    queryKey: ['jira-metrics', projectKey],
    queryFn: fetchJIRAMetrics,
    refetchInterval: refreshInterval,
    staleTime: 60000, // 1 minute
    retry: 2,
    retryDelay: 3000,
    enabled: !!projectKey
  });

  return {
    data: jiraQuery.data,
    loading: jiraQuery.isLoading,
    error: jiraQuery.error,
    refetch: jiraQuery.refetch
  };
};

// Hook for JIRA issue creation
export const useCreateJIRAIssue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issue: {
      projectKey: string;
      summary: string;
      description?: string;
      issueType: string;
      priority?: string;
      assignee?: string;
      labels?: string[];
      components?: string[];
      fixVersions?: string[];
      customFields?: Record<string, any>;
    }) => {
      const response = await fetch('/api/integrations/jira/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create JIRA issue');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate JIRA metrics to reflect new issue
      queryClient.invalidateQueries({ queryKey: ['jira-metrics', variables.projectKey] });
    }
  });
};

// Hook for JIRA issue updates
export const useUpdateJIRAIssue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: {
      issueKey: string;
      projectKey: string;
      fields?: Record<string, any>;
      transition?: {
        id: string;
        fields?: Record<string, any>;
      };
      comment?: string;
    }) => {
      const response = await fetch(`/api/integrations/jira/issues/${update.issueKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update JIRA issue');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jira-metrics', variables.projectKey] });
      queryClient.invalidateQueries({ queryKey: ['jira-issue', variables.issueKey] });
    }
  });
};

// Hook for JIRA sprint management
export const useJIRASprintManagement = (projectKey: string) => {
  return useQuery({
    queryKey: ['jira-sprints', projectKey],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/sprints?projectKey=${projectKey}`);
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
    staleTime: 180000, // 3 minutes
    enabled: !!projectKey
  });
};

// Hook for JIRA burndown data
export const useJIRABurndown = (sprintId: number) => {
  return useQuery({
    queryKey: ['jira-burndown', sprintId],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/burndown?sprintId=${sprintId}`);
      return response.json();
    },
    refetchInterval: 3600000, // 1 hour
    staleTime: 1800000, // 30 minutes
    enabled: !!sprintId
  });
};

// Hook for JIRA velocity tracking
export const useJIRAVelocity = (projectKey: string, sprintCount: number = 10) => {
  return useQuery({
    queryKey: ['jira-velocity', projectKey, sprintCount],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/velocity?projectKey=${projectKey}&sprintCount=${sprintCount}`);
      return response.json();
    },
    refetchInterval: 21600000, // 6 hours
    staleTime: 10800000, // 3 hours
    enabled: !!projectKey
  });
};

// Hook for JIRA cycle time analysis
export const useJIRACycleTime = (projectKey: string, timeRange: string = '30d') => {
  return useQuery({
    queryKey: ['jira-cycle-time', projectKey, timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/cycle-time?projectKey=${projectKey}&timeRange=${timeRange}`);
      return response.json();
    },
    refetchInterval: 3600000, // 1 hour
    staleTime: 1800000, // 30 minutes
    enabled: !!projectKey
  });
};

// Hook for JIRA quality metrics
export const useJIRAQualityMetrics = (projectKey: string) => {
  return useQuery({
    queryKey: ['jira-quality', projectKey],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/quality?projectKey=${projectKey}`);
      return response.json();
    },
    refetchInterval: 7200000, // 2 hours
    staleTime: 3600000, // 1 hour
    enabled: !!projectKey
  });
};

// Real-time JIRA webhooks hook
export const useJIRAWebhooks = (projectKey: string) => {
  const [webhookEvents, setWebhookEvents] = useState<Array<{
    id: string;
    webhookEvent: string;
    issue: {
      key: string;
      summary: string;
      status: string;
    };
    user: {
      displayName: string;
    };
    changeLog?: {
      items: Array<{
        field: string;
        fromString: string;
        toString: string;
      }>;
    };
    timestamp: Date;
  }>>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/integrations/jira/webhooks/stream?projectKey=${projectKey}`);
    
    eventSource.onmessage = (event) => {
      try {
        const webhookEvent = JSON.parse(event.data);
        setWebhookEvents(prev => [webhookEvent, ...prev].slice(0, 100)); // Keep last 100 events
      } catch (error) {
        console.error('Failed to parse JIRA webhook event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('JIRA webhooks SSE error:', error);
    };

    return () => eventSource.close();
  }, [projectKey]);

  return {
    webhookEvents,
    latestEvent: webhookEvents[0]
  };
};

// Hook for JIRA advanced search
export const useJIRASearch = (jql: string, maxResults: number = 50) => {
  return useQuery({
    queryKey: ['jira-search', jql, maxResults],
    queryFn: async () => {
      const response = await fetch('/api/integrations/jira/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jql, maxResults })
      });
      return response.json();
    },
    enabled: !!jql && jql.length > 0,
    staleTime: 30000 // 30 seconds
  });
};

// Hook for JIRA project configuration
export const useJIRAProjectConfig = (projectKey: string) => {
  return useQuery({
    queryKey: ['jira-project-config', projectKey],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/project/${projectKey}/config`);
      return response.json();
    },
    staleTime: 3600000, // 1 hour - project config doesn't change often
    refetchOnWindowFocus: false,
    enabled: !!projectKey
  });
};

// Hook for JIRA user assignments and workload
export const useJIRAWorkload = (projectKey: string) => {
  return useQuery({
    queryKey: ['jira-workload', projectKey],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/workload?projectKey=${projectKey}`);
      return response.json();
    },
    refetchInterval: 1800000, // 30 minutes
    staleTime: 900000, // 15 minutes
    enabled: !!projectKey
  });
};

// Hook for JIRA time tracking
export const useJIRATimeTracking = (projectKey: string, timeRange: string = '30d') => {
  return useQuery({
    queryKey: ['jira-time-tracking', projectKey, timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/time-tracking?projectKey=${projectKey}&timeRange=${timeRange}`);
      return response.json();
    },
    refetchInterval: 3600000, // 1 hour
    staleTime: 1800000, // 30 minutes
    enabled: !!projectKey
  });
};

// Hook for JIRA dashboard configuration
export const useJIRADashboard = (dashboardId?: string) => {
  return useQuery({
    queryKey: ['jira-dashboard', dashboardId],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/jira/dashboard${dashboardId ? `/${dashboardId}` : ''}`);
      return response.json();
    },
    staleTime: 1800000, // 30 minutes
    enabled: !!dashboardId
  });
};

// Hook for creating conductor issues from JIRA events
export const useCreateConductorIssue = () => {
  return useMutation({
    mutationFn: async (issue: {
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      source: 'jira';
      metadata: {
        jiraIssueKey: string;
        projectKey: string;
        issueType: string;
      };
    }) => {
      const response = await fetch('/api/conductor/v1/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create conductor issue');
      }
      
      return response.json();
    }
  });
};