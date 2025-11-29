import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Define the metrics interface matching the UI requirements
export interface SystemMetrics {
  routing: {
    avgLatency: number;
    totalRequests: number;
  };
  webOrchestration: {
    activeInterfaces: number;
  };
  infrastructure: {
    uptimePercentage: number;
  };
  status: 'healthy' | 'degraded' | 'critical';
}

interface ConductorMetricsOptions {
  timeRange?: string;
  refreshInterval?: number;
}

export function useConductorMetrics(options: ConductorMetricsOptions = {}) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['conductor-metrics', options.timeRange],
    queryFn: async () => {
      // Return mock data for now since backend endpoint might not match exactly
      // In production, this would be:
      // const response = await fetch('/api/metrics');
      // return await response.json();

      // Simulating network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        routing: {
          avgLatency: 45, // ms
          totalRequests: 1250
        },
        webOrchestration: {
          activeInterfaces: 3
        },
        infrastructure: {
          uptimePercentage: 99.99
        },
        status: 'healthy'
      } as SystemMetrics;
    },
    refetchInterval: options.refreshInterval || 15000,
    retry: 2
  });

  useEffect(() => {
    if (data) {
      setMetrics(data);
    }
  }, [data]);

  return {
    metrics,
    isLoading,
    error,
    refetch
  };
}

export function useConductorAlerts() {
  // Mock alerts hook
  return {
    unacknowledgedCount: 0,
    alerts: []
  };
}
