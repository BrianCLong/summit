import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

interface PluginMetrics {
  pluginId: string;
  memoryUsageMB: number;
  cpuPercent: number;
  requestCount: number;
  errorCount: number;
  avgResponseTimeMs: number;
}

interface UsePluginMetricsOptions {
  pluginId?: string;
  refreshInterval?: number;
  apiBaseUrl?: string;
}

export function usePluginMetrics(options: UsePluginMetricsOptions = {}) {
  const {
    pluginId,
    refreshInterval = 5000,
    apiBaseUrl = '/api/plugins',
  } = options;

  const [history, setHistory] = useState<PluginMetrics[]>([]);

  const query = useQuery({
    queryKey: ['plugin-metrics', pluginId],
    queryFn: async () => {
      const url = pluginId
        ? `${apiBaseUrl}/${pluginId}/metrics`
        : `${apiBaseUrl}/metrics`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  // Track history for charts
  useEffect(() => {
    if (query.data) {
      setHistory((prev) => {
        const newHistory = [...prev, query.data];
        // Keep last 60 data points (5 minutes at 5s intervals)
        return newHistory.slice(-60);
      });
    }
  }, [query.data]);

  return {
    ...query,
    history,
    clearHistory: () => setHistory([]),
  };
}

export function usePluginHealth(pluginId: string, apiBaseUrl = '/api/plugins') {
  return useQuery({
    queryKey: ['plugin-health', pluginId],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/${pluginId}/health`);
      if (!response.ok) throw new Error('Failed to fetch health');
      return response.json();
    },
    refetchInterval: 10000,
  });
}

export function usePluginLogs(pluginId: string, options: {
  level?: 'debug' | 'info' | 'warn' | 'error';
  limit?: number;
  apiBaseUrl?: string;
} = {}) {
  const { level, limit = 100, apiBaseUrl = '/api/plugins' } = options;

  return useQuery({
    queryKey: ['plugin-logs', pluginId, level],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (level) params.append('level', level);
      params.append('limit', limit.toString());

      const response = await fetch(`${apiBaseUrl}/${pluginId}/logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json();
    },
    refetchInterval: 5000,
  });
}
