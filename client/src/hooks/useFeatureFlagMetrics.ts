// client/src/hooks/useFeatureFlagMetrics.ts
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface FeatureFlagMetricsResponse {
  activeCount: number; // Number of active flags
  totalFlags: number; // Total number of flags
  usageStats: Array<{
    flagKey: string;
    enabled: boolean;
    usageCount: number;
    errorRate: number;
  }>;
  timestamp: number;
  // Previous values for trend calculation
  prevActiveCount?: number;
  prevTotalFlags?: number;
  chartData?: Array<{ flagKey: string; usageCount: number; errorRate: number }>;
}

export interface UseFeatureFlagMetricsReturn {
  metrics: FeatureFlagMetricsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch feature flag metrics
 */
export const useFeatureFlagMetrics = (timeRange: string = '1h'): UseFeatureFlagMetricsReturn => {
  const [metrics, setMetrics] = useState<FeatureFlagMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate with mock data
      const response = await fetch(`/api/feature-flags/metrics?range=${timeRange}`, {
        headers: {
          'Content-Type': 'application/json',
          // Add any auth headers if needed
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FeatureFlagMetricsResponse = await response.json();
      setMetrics(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      logger.error('Error fetching feature flag metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
  }, [timeRange]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
};

export default useFeatureFlagMetrics;