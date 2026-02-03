/**
 * Analytics Hooks
 *
 * React hooks for governance and compliance analytics.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module hooks/useAnalytics
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  GovernanceMetricsAPI,
  ComplianceMetricsAPI,
  GovernanceMetricsSummary,
  VerdictDistribution,
  VerdictTrend,
  PolicyEffectiveness,
  AnomalyEvent,
  ComplianceSummary,
  AuditReadiness,
  ControlStatus,
  ControlEffectiveness,
  FrameworkStatus,
  TimeRange,
} from '../services/analytics-api';

// ============================================================================
// Types
// ============================================================================

export interface UseAnalyticsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface TimeRangePreset {
  label: string;
  value: string;
  getRange: () => Partial<TimeRange>;
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

// ============================================================================
// Time Range Presets
// ============================================================================

export const TIME_RANGE_PRESETS: TimeRangePreset[] = [
  {
    label: 'Last 24 Hours',
    value: '24h',
    getRange: () => ({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      granularity: 'hour',
    }),
  },
  {
    label: 'Last 7 Days',
    value: '7d',
    getRange: () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      granularity: 'day',
    }),
  },
  {
    label: 'Last 30 Days',
    value: '30d',
    getRange: () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      granularity: 'day',
    }),
  },
  {
    label: 'Last 90 Days',
    value: '90d',
    getRange: () => ({
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      granularity: 'week',
    }),
  },
];

// ============================================================================
// Governance Analytics Hooks
// ============================================================================

/**
 * Hook for governance metrics summary
 */
export function useGovernanceMetrics(presetValue: string = '7d') {
  const [state, setState] = useState<UseAnalyticsState<GovernanceMetricsSummary>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const timeRange = useMemo(() => {
    const preset = TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
    return preset?.getRange() || TIME_RANGE_PRESETS[1].getRange();
  }, [presetValue]);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await GovernanceMetricsAPI.getSummary(timeRange);
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load governance metrics'),
      }));
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData, timeRange };
}

/**
 * Hook for verdict distribution
 */
export function useVerdictDistribution(presetValue: string = '7d') {
  const [state, setState] = useState<UseAnalyticsState<VerdictDistribution>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const timeRange = useMemo(() => {
    const preset = TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
    return preset?.getRange() || TIME_RANGE_PRESETS[1].getRange();
  }, [presetValue]);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await GovernanceMetricsAPI.getVerdictDistribution(timeRange);
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load verdict distribution'),
      }));
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

/**
 * Hook for verdict trends
 */
export function useVerdictTrends(presetValue: string = '7d') {
  const [state, setState] = useState<UseAnalyticsState<VerdictTrend[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const timeRange = useMemo(() => {
    const preset = TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
    return preset?.getRange() || TIME_RANGE_PRESETS[1].getRange();
  }, [presetValue]);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await GovernanceMetricsAPI.getVerdictTrends(timeRange);
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load verdict trends'),
      }));
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

/**
 * Hook for policy effectiveness
 */
export function usePolicyEffectiveness(presetValue: string = '7d', limit: number = 10) {
  const [state, setState] = useState<UseAnalyticsState<PolicyEffectiveness[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const timeRange = useMemo(() => {
    const preset = TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
    return preset?.getRange() || TIME_RANGE_PRESETS[1].getRange();
  }, [presetValue]);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await GovernanceMetricsAPI.getPolicyEffectiveness(timeRange, limit);
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load policy effectiveness'),
      }));
    }
  }, [timeRange, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

/**
 * Hook for anomaly detection
 */
export function useAnomalies(presetValue: string = '7d') {
  const [state, setState] = useState<UseAnalyticsState<AnomalyEvent[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const timeRange = useMemo(() => {
    const preset = TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
    return preset?.getRange() || TIME_RANGE_PRESETS[1].getRange();
  }, [presetValue]);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await GovernanceMetricsAPI.getAnomalies(timeRange);
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load anomalies'),
      }));
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

// ============================================================================
// Compliance Analytics Hooks
// ============================================================================

/**
 * Hook for compliance summary
 */
export function useComplianceSummary() {
  const [state, setState] = useState<UseAnalyticsState<ComplianceSummary>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await ComplianceMetricsAPI.getSummary();
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load compliance summary'),
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

/**
 * Hook for audit readiness
 */
export function useAuditReadiness() {
  const [state, setState] = useState<UseAnalyticsState<AuditReadiness>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await ComplianceMetricsAPI.getAuditReadiness();
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load audit readiness'),
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

/**
 * Hook for control status
 */
export function useControlStatus(framework?: string) {
  const [state, setState] = useState<UseAnalyticsState<ControlStatus[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await ComplianceMetricsAPI.getControlStatus(framework);
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load control status'),
      }));
    }
  }, [framework]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

/**
 * Hook for control effectiveness
 */
export function useControlEffectiveness() {
  const [state, setState] = useState<UseAnalyticsState<ControlEffectiveness[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await ComplianceMetricsAPI.getControlEffectiveness();
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load control effectiveness'),
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

/**
 * Hook for framework status
 */
export function useFrameworkStatus() {
  const [state, setState] = useState<UseAnalyticsState<FrameworkStatus[]>>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await ComplianceMetricsAPI.getFrameworkStatus();
      setState({
        data: response.data,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to load framework status'),
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}

export default {
  useGovernanceMetrics,
  useVerdictDistribution,
  useVerdictTrends,
  usePolicyEffectiveness,
  useAnomalies,
  useComplianceSummary,
  useAuditReadiness,
  useControlStatus,
  useControlEffectiveness,
  useFrameworkStatus,
};
