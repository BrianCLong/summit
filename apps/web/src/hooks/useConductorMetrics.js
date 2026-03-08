"use strict";
// apps/web/src/hooks/useConductorMetrics.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.useConductorQualityMetrics = exports.useConductorCostAnalytics = exports.useConductorPerformanceAnalytics = exports.useConductorAlerts = exports.useConductorMetrics = void 0;
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const useConductorMetrics = (options) => {
    const { timeRange, refreshInterval = 30000, tenantId } = options;
    const intervalRef = (0, react_1.useRef)(undefined);
    const fetchMetrics = async () => {
        const params = new URLSearchParams({
            timeRange,
            ...(tenantId && { tenantId }),
        });
        const response = await fetch(`/api/conductor/v1/metrics?${params}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Conductor-API-Version': 'v1',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch conductor metrics: ${response.statusText}`);
        }
        return response.json();
    };
    const query = (0, react_query_1.useQuery)({
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
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    });
    // Real-time updates using SSE
    (0, react_1.useEffect)(() => {
        if (!refreshInterval) {
            return;
        }
        const eventSource = new EventSource(`/api/conductor/v1/metrics/stream?timeRange=${timeRange}`);
        eventSource.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                // Update query cache with real-time data
                query.refetch();
            }
            catch (error) {
                console.error('Failed to parse real-time metrics:', error);
            }
        };
        eventSource.onerror = error => {
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
        dataUpdatedAt: query.dataUpdatedAt,
    };
};
exports.useConductorMetrics = useConductorMetrics;
// Enhanced hook for real-time alerting
const useConductorAlerts = () => {
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const eventSource = new EventSource('/api/conductor/v1/alerts/stream');
        eventSource.onmessage = event => {
            try {
                const alert = JSON.parse(event.data);
                setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
            }
            catch (error) {
                console.error('Failed to parse alert:', error);
            }
        };
        return () => eventSource.close();
    }, []);
    const acknowledgeAlert = async (alertId) => {
        try {
            await fetch(`/api/conductor/v1/alerts/${alertId}/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            setAlerts(prev => prev.map(alert => alert.id === alertId ? { ...alert, acknowledged: true } : alert));
        }
        catch (error) {
            console.error('Failed to acknowledge alert:', error);
        }
    };
    return {
        alerts,
        acknowledgeAlert,
        unacknowledgedCount: alerts.filter(a => !a.acknowledged).length,
    };
};
exports.useConductorAlerts = useConductorAlerts;
// Performance analytics hook
const useConductorPerformanceAnalytics = (timeRange) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['conductor-performance', timeRange],
        queryFn: async () => {
            const response = await fetch(`/api/conductor/v1/analytics/performance?timeRange=${timeRange}`);
            return response.json();
        },
        refetchInterval: 60000, // Update every minute
        staleTime: 30000,
    });
};
exports.useConductorPerformanceAnalytics = useConductorPerformanceAnalytics;
// Cost analytics hook
const useConductorCostAnalytics = (timeRange) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['conductor-costs', timeRange],
        queryFn: async () => {
            const response = await fetch(`/api/conductor/v1/analytics/costs?timeRange=${timeRange}`);
            return response.json();
        },
        refetchInterval: 300000, // Update every 5 minutes
        staleTime: 120000,
    });
};
exports.useConductorCostAnalytics = useConductorCostAnalytics;
// Quality metrics hook
const useConductorQualityMetrics = (timeRange) => {
    return (0, react_query_1.useQuery)({
        queryKey: ['conductor-quality', timeRange],
        queryFn: async () => {
            const response = await fetch(`/api/conductor/v1/analytics/quality?timeRange=${timeRange}`);
            return response.json();
        },
        refetchInterval: 120000, // Update every 2 minutes
        staleTime: 60000,
    });
};
exports.useConductorQualityMetrics = useConductorQualityMetrics;
