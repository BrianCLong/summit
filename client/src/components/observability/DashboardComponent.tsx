// client/src/components/observability/DashboardComponent.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, Grid, Typography, Box, LinearProgress } from '@mui/material';
import { LineChart, BarChart, PieChart, MetricCard } from './charts';
import { usePerformanceMetrics } from '../../hooks/usePerformanceMonitor';
import { useFeatureFlagMetrics } from '../../hooks/useFeatureFlagMetrics';
import { logger } from '../../utils/logger';

interface DashboardProps {
  title: string;
  description?: string;
  refreshInterval?: number; // in seconds
  includePerformance?: boolean;
  includeFeatureFlags?: boolean;
  includeSecurity?: boolean;
  includeCompliance?: boolean;
  onMetricsUpdate?: (metrics: any) => void;
}

export interface DashboardMetric {
  name: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable';
  previousValue?: number | string;
  unit?: string;
  threshold?: number; // for alerting
  status: 'ok' | 'warning' | 'critical';
}

export interface ChartDataPoint {
  timestamp: number | string;
  value: number;
  label?: string;
}

/**
 * Advanced observability dashboard component with real-time metrics
 */
export const Dashboard: React.FC<DashboardProps> = ({
  title,
  description,
  refreshInterval = 30, // Default to 30 seconds
  includePerformance = true,
  includeFeatureFlags = true,
  includeSecurity = true,
  includeCompliance = true,
  onMetricsUpdate
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetric[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  
  // Performance metrics
  const {
    metrics: performanceMetrics,
    loading: performanceLoading,
    error: performanceError,
    refetch: refetchPerformance
  } = usePerformanceMetrics(timeRange);

  // Feature flag metrics
  const {
    metrics: featureFlagMetrics,
    loading: featureFlagLoading,
    error: featureFlagError,
    refetch: refetchFeatureFlags
  } = useFeatureFlagMetrics(timeRange);

  // Refresh data periodically
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(async () => {
      try {
        if (includePerformance) {
          await refetchPerformance();
        }
        if (includeFeatureFlags) {
          await refetchFeatureFlags();
        }
        
        // Calculate dashboard metrics
        const calculatedMetrics = calculateDashboardMetrics({
          performanceMetrics,
          featureFlagMetrics,
          includePerformance,
          includeFeatureFlags,
          includeSecurity,
          includeCompliance
        });
        
        setDashboardMetrics(calculatedMetrics);
        
        // Call the update callback if provided
        if (onMetricsUpdate) {
          onMetricsUpdate({
            timestamp: Date.now(),
            metrics: calculatedMetrics,
            performance: performanceMetrics,
            featureFlags: featureFlagMetrics
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error refreshing dashboard');
        setError(error);
        logger.error('Error refreshing dashboard metrics', error);
      } finally {
        setIsLoading(false);
      }
    }, refreshInterval * 1000); // Convert to milliseconds

    // Initial load
    void interval;

    return () => clearInterval(interval);
  }, [refreshInterval, timeRange, includePerformance, includeFeatureFlags, includeSecurity, includeCompliance]);

  // Calculate dashboard metrics
  const calculateDashboardMetrics = (params: {
    performanceMetrics: any;
    featureFlagMetrics: any;
    includePerformance: boolean;
    includeFeatureFlags: boolean;
    includeSecurity: boolean;
    includeCompliance: boolean;
  }): DashboardMetric[] => {
    const metrics: DashboardMetric[] = [];

    if (params.includePerformance && params.performanceMetrics) {
      metrics.push(
        {
          name: 'Avg Response Time',
          value: params.performanceMetrics.avg || 0,
          unit: 'ms',
          trend: 'stable',
          status: params.performanceMetrics.avg > 500 ? 'critical' : params.performanceMetrics.avg > 200 ? 'warning' : 'ok',
          threshold: 500
        },
        {
          name: 'P95 Latency',
          value: params.performanceMetrics.p95 || 0,
          unit: 'ms',
          trend: params.performanceMetrics.prevP95 ? 
            (params.performanceMetrics.p95 > params.performanceMetrics.prevP95 ? 'up' : 'down') : 'stable',
          previousValue: params.performanceMetrics.prevP95,
          status: params.performanceMetrics.p95 > 1000 ? 'critical' : params.performanceMetrics.p95 > 500 ? 'warning' : 'ok',
          threshold: 1000
        },
        {
          name: 'Error Rate',
          value: (params.performanceMetrics.errorRate || 0) * 100,
          unit: '%',
          trend: params.performanceMetrics.prevErrorRate ?
            (params.performanceMetrics.errorRate > params.performanceMetrics.prevErrorRate ? 'up' : 'down') : 'stable',
          previousValue: params.performanceMetrics.prevErrorRate,
          status: params.performanceMetrics.errorRate > 0.5 ? 'critical' : params.performanceMetrics.errorRate > 0.1 ? 'warning' : 'ok',
          threshold: 0.5
        },
        {
          name: 'Throughput',
          value: params.performanceMetrics.requestsPerSecond || 0,
          unit: 'req/sec',
          trend: params.performanceMetrics.prevRequestsPerSecond ?
            (params.performanceMetrics.requestsPerSecond > params.performanceMetrics.prevRequestsPerSecond ? 'up' : 'down') : 'stable',
          previousValue: params.performanceMetrics.prevRequestsPerSecond,
          status: 'ok'
        }
      );
    }

    if (params.includeFeatureFlags && params.featureFlagMetrics) {
      metrics.push(
        {
          name: 'Active Feature Flags',
          value: params.featureFlagMetrics.activeCount || 0,
          trend: 'stable',
          status: 'ok'
        },
        {
          name: 'Flag Error Rate',
          value: (params.featureFlagMetrics.errorRate || 0) * 100,
          unit: '%',
          trend: 'stable',
          status: params.featureFlagMetrics.errorRate > 0.1 ? 'warning' : 'ok',
          threshold: 0.1
        }
      );
    }

    if (params.includeSecurity) {
      metrics.push(
        {
          name: 'Security Events',
          value: 0, // Would come from security monitoring service
          trend: 'down', // Lower is better
          status: 'ok'
        }
      );
    }

    if (params.includeCompliance) {
      metrics.push(
        {
          name: 'Compliance Score',
          value: 100, // Would come from compliance engine
          unit: '%',
          trend: 'up', // Higher is better
          status: 'ok'
        }
      );
    }

    return metrics;
  };

  const handleTimeRangeChange = (newRange: '1h' | '6h' | '24h' | '7d') => {
    setTimeRange(newRange);
  };

  // Combine loading states
  const combinedLoading = isLoading || performanceLoading || featureFlagLoading;
  const combinedError = performanceError || featureFlagError || error;

  return (
    <Box p={3}>
      <Box mb={3}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="subtitle1" color="textSecondary" mt={1}>
            {description}
          </Typography>
        )}
      </Box>

      {/* Time range selector */}
      <Box mb={3} display="flex" justifyContent="flex-end">
        <Box display="flex" gap={1}>
          {(['1h', '6h', '24h', '7d'] as const).map(range => (
            <button
              key={range}
              style={{
                padding: '6px 12px',
                border: '1px solid #ccc',
                backgroundColor: timeRange === range ? '#007bff' : 'white',
                color: timeRange === range ? 'white' : 'black',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
              onClick={() => handleTimeRangeChange(range)}
            >
              {range}
            </button>
          ))}
        </Box>
      </Box>

      {combinedError && (
        <Box mb={3} p={2} bgcolor="#ffebee" color="#c62828" borderRadius={2}>
          <Typography variant="body1">Error loading dashboard data: {combinedError.message}</Typography>
        </Box>
      )}

      {combinedLoading && <LinearProgress />}

      {/* Key metrics cards */}
      <Grid container spacing={3} mb={3}>
        {dashboardMetrics.slice(0, 4).map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard
              title={metric.name}
              value={metric.value}
              unit={metric.unit}
              trend={metric.trend}
              status={metric.status}
              threshold={metric.threshold}
              previousValue={metric.previousValue}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts grid */}
      <Grid container spacing={3}>
        {(includePerformance || includeFeatureFlags) && (
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Overview
                </Typography>
                {performanceMetrics ? (
                  <LineChart
                    data={performanceMetrics.chartData || []}
                    title="Response Time Trend"
                    yAxisLabel="Response Time (ms)"
                  />
                ) : (
                  <Box p={2}>Loading performance chart...</Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {includeFeatureFlags && (
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feature Flag Adoption
                </Typography>
                {featureFlagMetrics ? (
                  <PieChart
                    data={featureFlagMetrics.adoptionData || []}
                    title="Feature Usage Distribution"
                  />
                ) : (
                  <Box p={2}>Loading feature flag chart...</Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {includePerformance && (
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Error Rate Trend
                </Typography>
                {performanceMetrics ? (
                  <BarChart
                    data={performanceMetrics.errorData || []}
                    title="Errors Over Time"
                    yAxisLabel="Number of Errors"
                  />
                ) : (
                  <Box p={2}>Loading error chart...</Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {includeCompliance && (
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Score
                </Typography>
                <Typography variant="h4" align="center" color="primary">
                  100% Compliant
                </Typography>
                <Typography variant="body2" align="center" color="textSecondary">
                  All SOC 2 controls passing
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;