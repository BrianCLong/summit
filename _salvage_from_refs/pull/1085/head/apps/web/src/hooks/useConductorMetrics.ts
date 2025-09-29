// apps/web/src/hooks/useConductorMetrics.ts

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ConductorMetrics {
  routing: {
    totalRequests: number;
    successRate: number;
    avgLatency: number;
    expertDistribution: Record<string, number>;
    qualityGatesPassed: number;
    costEfficiency: number;
    timeSeriesData: Array<{
      timestamp: string;
      requests: number;
      latency: number;
      successRate: number;
    }>;
  };
  webOrchestration: {
    activeInterfaces: number;
    synthesisQuality: number;
    complianceScore: number;
    citationCoverage: number;
    contradictionRate: number;
    interfacePerformance: Record<string, {
      responseTime: number;
      qualityScore: number;
      uptime: number;
    }>;
  };
  premiumModels: {
    utilizationRate: number;
    costSavings: number;
    qualityImprovement: number;
    modelDistribution: Record<string, number>;
    thomsonSamplingConvergence: number;
    modelPerformance: Record<string, {
      successRate: number;
      avgCost: number;
      avgLatency: number;
      qualityScore: number;
    }>;
  };
  infrastructure: {
    uptimePercentage: number;
    scalingEvents: number;
    alertsActive: number;
    budgetUtilization: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      storage: number;
    };
  };
}

interface UseConductorMetricsOptions {
  timeRange: '1h' | '24h' | '7d' | '30d';
  refreshInterval?: number;
  tenantId?: string;
}

export const useConductorMetrics = (options: UseConductorMetricsOptions) => {
  const { timeRange, refreshInterval = 30000, tenantId } = options;
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const fetchMetrics = async (): Promise<ConductorMetrics> => {
    const params = new URLSearchParams({
      timeRange,
      ...(tenantId && { tenantId })
    });

    const response = await fetch(`/api/conductor/v1/metrics?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Conductor-API-Version': 'v1'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conductor metrics: ${response.statusText}`);
    }

    return response.json();
  };

  const query = useQuery({
    queryKey: ['conductor-metrics', timeRange, tenantId],
    queryFn: fetchMetrics,
    refetchInterval: refreshInterval,
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      if (failureCount < 3 && error.message.includes('Failed to fetch')) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Real-time updates using SSE
  useEffect(() => {
    if (!refreshInterval) return;

    const eventSource = new EventSource(`/api/conductor/v1/metrics/stream?timeRange=${timeRange}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Update query cache with real-time data
        query.refetch();
      } catch (error) {
        console.error('Failed to parse real-time metrics:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [timeRange, refreshInterval]);

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt
  };
};

// Enhanced hook for real-time alerting
export const useConductorAlerts = () => {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
    source: string;
  }>>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/conductor/v1/alerts/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const alert = JSON.parse(event.data);
        setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
      } catch (error) {
        console.error('Failed to parse alert:', error);
      }
    };

    return () => eventSource.close();
  }, []);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/conductor/v1/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  return {
    alerts,
    acknowledgeAlert,
    unacknowledgedCount: alerts.filter(a => !a.acknowledged).length
  };
};

// Performance analytics hook
export const useConductorPerformanceAnalytics = (timeRange: string) => {
  return useQuery({
    queryKey: ['conductor-performance', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/conductor/v1/analytics/performance?timeRange=${timeRange}`);
      return response.json();
    },
    refetchInterval: 60000, // Update every minute
    staleTime: 30000
  });
};

// Cost analytics hook
export const useConductorCostAnalytics = (timeRange: string) => {
  return useQuery({
    queryKey: ['conductor-costs', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/conductor/v1/analytics/costs?timeRange=${timeRange}`);
      return response.json();
    },
    refetchInterval: 300000, // Update every 5 minutes
    staleTime: 120000
  });
};

// Quality metrics hook
export const useConductorQualityMetrics = (timeRange: string) => {
  return useQuery({
    queryKey: ['conductor-quality', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/conductor/v1/analytics/quality?timeRange=${timeRange}`);
      return response.json();
    },
    refetchInterval: 120000, // Update every 2 minutes
    staleTime: 60000
  });
};