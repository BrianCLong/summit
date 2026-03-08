"use strict";
/**
 * Analytics Hooks
 *
 * React hooks for governance and compliance analytics.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module hooks/useAnalytics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIME_RANGE_PRESETS = void 0;
exports.useGovernanceMetrics = useGovernanceMetrics;
exports.useVerdictDistribution = useVerdictDistribution;
exports.useVerdictTrends = useVerdictTrends;
exports.usePolicyEffectiveness = usePolicyEffectiveness;
exports.useAnomalies = useAnomalies;
exports.useComplianceSummary = useComplianceSummary;
exports.useAuditReadiness = useAuditReadiness;
exports.useControlStatus = useControlStatus;
exports.useControlEffectiveness = useControlEffectiveness;
exports.useFrameworkStatus = useFrameworkStatus;
const react_1 = require("react");
const analytics_api_1 = require("../services/analytics-api");
const getErrorMessage = (err, fallback) => err instanceof Error && err.message ? err.message : fallback;
// ============================================================================
// Time Range Presets
// ============================================================================
exports.TIME_RANGE_PRESETS = [
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
function useGovernanceMetrics(presetValue = '7d') {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const timeRange = (0, react_1.useMemo)(() => {
        const preset = exports.TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
        return preset?.getRange() || exports.TIME_RANGE_PRESETS[1].getRange();
    }, [presetValue]);
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.GovernanceMetricsAPI.getSummary(timeRange);
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load governance metrics'),
            }));
        }
    }, [timeRange]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData, timeRange };
}
/**
 * Hook for verdict distribution
 */
function useVerdictDistribution(presetValue = '7d') {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const timeRange = (0, react_1.useMemo)(() => {
        const preset = exports.TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
        return preset?.getRange() || exports.TIME_RANGE_PRESETS[1].getRange();
    }, [presetValue]);
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.GovernanceMetricsAPI.getVerdictDistribution(timeRange);
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load verdict distribution'),
            }));
        }
    }, [timeRange]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
/**
 * Hook for verdict trends
 */
function useVerdictTrends(presetValue = '7d') {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const timeRange = (0, react_1.useMemo)(() => {
        const preset = exports.TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
        return preset?.getRange() || exports.TIME_RANGE_PRESETS[1].getRange();
    }, [presetValue]);
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.GovernanceMetricsAPI.getVerdictTrends(timeRange);
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load verdict trends'),
            }));
        }
    }, [timeRange]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
/**
 * Hook for policy effectiveness
 */
function usePolicyEffectiveness(presetValue = '7d', limit = 10) {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const timeRange = (0, react_1.useMemo)(() => {
        const preset = exports.TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
        return preset?.getRange() || exports.TIME_RANGE_PRESETS[1].getRange();
    }, [presetValue]);
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.GovernanceMetricsAPI.getPolicyEffectiveness(timeRange, limit);
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load policy effectiveness'),
            }));
        }
    }, [timeRange, limit]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
/**
 * Hook for anomaly detection
 */
function useAnomalies(presetValue = '7d') {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const timeRange = (0, react_1.useMemo)(() => {
        const preset = exports.TIME_RANGE_PRESETS.find((p) => p.value === presetValue);
        return preset?.getRange() || exports.TIME_RANGE_PRESETS[1].getRange();
    }, [presetValue]);
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.GovernanceMetricsAPI.getAnomalies(timeRange);
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load anomalies'),
            }));
        }
    }, [timeRange]);
    (0, react_1.useEffect)(() => {
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
function useComplianceSummary() {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.ComplianceMetricsAPI.getSummary();
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load compliance summary'),
            }));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
/**
 * Hook for audit readiness
 */
function useAuditReadiness() {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.ComplianceMetricsAPI.getAuditReadiness();
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load audit readiness'),
            }));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
/**
 * Hook for control status
 */
function useControlStatus(framework) {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.ComplianceMetricsAPI.getControlStatus(framework);
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load control status'),
            }));
        }
    }, [framework]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
/**
 * Hook for control effectiveness
 */
function useControlEffectiveness() {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.ComplianceMetricsAPI.getControlEffectiveness();
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load control effectiveness'),
            }));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
/**
 * Hook for framework status
 */
function useFrameworkStatus() {
    const [state, setState] = (0, react_1.useState)({
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
    });
    const fetchData = (0, react_1.useCallback)(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await analytics_api_1.ComplianceMetricsAPI.getFrameworkStatus();
            setState({
                data: response.data,
                loading: false,
                error: null,
                lastUpdated: new Date().toISOString(),
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to load framework status'),
            }));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [fetchData]);
    return { ...state, refresh: fetchData };
}
exports.default = {
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
