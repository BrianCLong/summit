// client/src/hooks/usePerformanceMonitor.ts
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface PerformanceMetricsResponse {
  avg: number; // Average response time in ms
  p50: number; // 50th percentile
  p90: number; // 90th percentile
  p95: number; // 95th percentile
  p99: number; // 99th percentile
  errorRate: number; // Error rate as decimal (0.01 = 1%)
  requestsPerSecond: number;
  timestamp: number;
  // Previous values for trend calculation
  prevAvg?: number;
  prevP95?: number;
  prevErrorRate?: number;
  prevRequestsPerSecond?: number;
  chartData?: Array<{ timestamp: number; value: number }>;
  errorData?: Array<{ timestamp: number; value: number }>;
}

export interface UsePerformanceMetricsReturn {
  metrics: PerformanceMetricsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch performance metrics
 */
export const usePerformanceMetrics = (timeRange: string = '1h'): UsePerformanceMetricsReturn => {
  const [metrics, setMetrics] = useState<PerformanceMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate with mock data
      const response = await fetch(`/api/performance/metrics?range=${timeRange}`, {
        headers: {
          'Content-Type': 'application/json',
          // Add any auth headers if needed
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PerformanceMetricsResponse = await response.json();
      setMetrics(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      logger.error('Error fetching performance metrics:', error);
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

export default usePerformanceMetrics;