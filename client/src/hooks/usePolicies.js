"use strict";
/**
 * Policy Management Hook
 *
 * React hook for managing governance policies with optimistic updates.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module hooks/usePolicies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePolicies = usePolicies;
exports.usePolicyDetail = usePolicyDetail;
exports.usePolicyOperations = usePolicyOperations;
exports.usePolicySimulator = usePolicySimulator;
exports.usePolicyManagement = usePolicyManagement;
const react_1 = require("react");
const policy_api_1 = require("../services/policy-api");
const getErrorMessage = (err, fallback) => err instanceof Error && err.message ? err.message : fallback;
// ============================================================================
// Policy List Hook
// ============================================================================
/**
 * Hook for managing policy list with pagination and filtering
 */
function usePolicies(initialFilters = {}) {
    const [state, setState] = (0, react_1.useState)({
        policies: [],
        loading: false,
        error: null,
        pagination: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0,
        },
    });
    const [filters, setFilters] = (0, react_1.useState)(initialFilters);
    const fetchPolicies = (0, react_1.useCallback)(async (filterOverrides) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const appliedFilters = { ...filters, ...filterOverrides };
            const response = await policy_api_1.PolicyAPI.listPolicies(appliedFilters);
            setState({
                policies: response.data.policies,
                loading: false,
                error: null,
                pagination: response.data.pagination,
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to fetch policies'),
            }));
        }
    }, [filters]);
    const refresh = (0, react_1.useCallback)(() => fetchPolicies(), [fetchPolicies]);
    const updateFilters = (0, react_1.useCallback)((newFilters) => {
        const updated = { ...filters, ...newFilters };
        setFilters(updated);
        fetchPolicies(updated);
    }, [filters, fetchPolicies]);
    const goToPage = (0, react_1.useCallback)((page) => {
        updateFilters({ page });
    }, [updateFilters]);
    // Initial load
    (0, react_1.useEffect)(() => {
        fetchPolicies();
    }, [fetchPolicies]);
    return {
        ...state,
        filters,
        refresh,
        updateFilters,
        goToPage,
    };
}
// ============================================================================
// Policy Detail Hook
// ============================================================================
/**
 * Hook for managing a single policy with versions
 */
function usePolicyDetail(policyId) {
    const [state, setState] = (0, react_1.useState)({
        policy: null,
        versions: [],
        loading: false,
        error: null,
    });
    const fetchPolicy = (0, react_1.useCallback)(async () => {
        if (!policyId) {
            setState({ policy: null, versions: [], loading: false, error: null });
            return;
        }
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const [policyResponse, versionsResponse] = await Promise.all([
                policy_api_1.PolicyAPI.getPolicy(policyId),
                policy_api_1.PolicyAPI.listVersions(policyId),
            ]);
            setState({
                policy: policyResponse.data,
                versions: versionsResponse.data.versions,
                loading: false,
                error: null,
            });
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Failed to fetch policy'),
            }));
        }
    }, [policyId]);
    const refresh = (0, react_1.useCallback)(() => fetchPolicy(), [fetchPolicy]);
    // Load when policyId changes
    (0, react_1.useEffect)(() => {
        fetchPolicy();
    }, [fetchPolicy]);
    return {
        ...state,
        refresh,
    };
}
// ============================================================================
// Policy Operations Hook
// ============================================================================
/**
 * Hook for policy CRUD and workflow operations
 */
function usePolicyOperations() {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const createPolicy = (0, react_1.useCallback)(async (input) => {
        setLoading(true);
        setError(null);
        try {
            const response = await policy_api_1.PolicyAPI.createPolicy(input);
            setLoading(false);
            if (response.data.success) {
                return response.data.policy;
            }
            return null;
        }
        catch (err) {
            setError(getErrorMessage(err, 'Failed to create policy'));
            setLoading(false);
            return null;
        }
    }, []);
    const updatePolicy = (0, react_1.useCallback)(async (policyId, input) => {
        setLoading(true);
        setError(null);
        try {
            const response = await policy_api_1.PolicyAPI.updatePolicy(policyId, input);
            setLoading(false);
            if (response.data.success) {
                return response.data.policy;
            }
            return null;
        }
        catch (err) {
            setError(getErrorMessage(err, 'Failed to update policy'));
            setLoading(false);
            return null;
        }
    }, []);
    const deletePolicy = (0, react_1.useCallback)(async (policyId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await policy_api_1.PolicyAPI.deletePolicy(policyId);
            setLoading(false);
            return response.data.success;
        }
        catch (err) {
            setError(getErrorMessage(err, 'Failed to delete policy'));
            setLoading(false);
            return false;
        }
    }, []);
    const rollbackPolicy = (0, react_1.useCallback)(async (policyId, targetVersion) => {
        setLoading(true);
        setError(null);
        try {
            const response = await policy_api_1.PolicyAPI.rollbackPolicy(policyId, targetVersion);
            setLoading(false);
            if (response.data.success) {
                return response.data.policy;
            }
            return null;
        }
        catch (err) {
            setError(getErrorMessage(err, 'Failed to rollback policy'));
            setLoading(false);
            return null;
        }
    }, []);
    const submitForApproval = (0, react_1.useCallback)(async (policyId, reason) => {
        setLoading(true);
        setError(null);
        try {
            const response = await policy_api_1.PolicyAPI.submitForApproval(policyId, reason);
            setLoading(false);
            if (response.data.success) {
                return response.data.request;
            }
            return null;
        }
        catch (err) {
            setError(getErrorMessage(err, 'Failed to submit for approval'));
            setLoading(false);
            return null;
        }
    }, []);
    const approvePolicy = (0, react_1.useCallback)(async (policyId, notes) => {
        setLoading(true);
        setError(null);
        try {
            const response = await policy_api_1.PolicyAPI.approvePolicy(policyId, notes);
            setLoading(false);
            if (response.data.success) {
                return response.data.policy;
            }
            return null;
        }
        catch (err) {
            setError(getErrorMessage(err, 'Failed to approve policy'));
            setLoading(false);
            return null;
        }
    }, []);
    const publishPolicy = (0, react_1.useCallback)(async (policyId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await policy_api_1.PolicyAPI.publishPolicy(policyId);
            setLoading(false);
            if (response.data.success) {
                return response.data.policy;
            }
            return null;
        }
        catch (err) {
            setError(getErrorMessage(err, 'Failed to publish policy'));
            setLoading(false);
            return null;
        }
    }, []);
    const clearError = (0, react_1.useCallback)(() => setError(null), []);
    return {
        loading,
        error,
        clearError,
        createPolicy,
        updatePolicy,
        deletePolicy,
        rollbackPolicy,
        submitForApproval,
        approvePolicy,
        publishPolicy,
    };
}
// ============================================================================
// Policy Simulator Hook
// ============================================================================
/**
 * Hook for policy simulation and impact analysis
 */
function usePolicySimulator() {
    const [state, setState] = (0, react_1.useState)({
        result: null,
        batchResult: null,
        impactAnalysis: null,
        loading: false,
        error: null,
    });
    const simulate = (0, react_1.useCallback)(async (request) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await policy_api_1.PolicySimulatorAPI.simulate(request);
            setState((prev) => ({
                ...prev,
                result: response.data,
                loading: false,
            }));
            return response.data;
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Simulation failed'),
            }));
            return null;
        }
    }, []);
    const batchSimulate = (0, react_1.useCallback)(async (policy, contexts) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await policy_api_1.PolicySimulatorAPI.batchSimulate(policy, contexts);
            setState((prev) => ({
                ...prev,
                batchResult: response.data,
                loading: false,
            }));
            return response.data;
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Batch simulation failed'),
            }));
            return null;
        }
    }, []);
    const analyzeImpact = (0, react_1.useCallback)(async (currentPolicy, newPolicy) => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const response = await policy_api_1.PolicySimulatorAPI.analyzeImpact(currentPolicy, newPolicy);
            setState((prev) => ({
                ...prev,
                impactAnalysis: response.data,
                loading: false,
            }));
            return response.data;
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                loading: false,
                error: getErrorMessage(err, 'Impact analysis failed'),
            }));
            return null;
        }
    }, []);
    const clearResults = (0, react_1.useCallback)(() => {
        setState({
            result: null,
            batchResult: null,
            impactAnalysis: null,
            loading: false,
            error: null,
        });
    }, []);
    const clearError = (0, react_1.useCallback)(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);
    return {
        ...state,
        simulate,
        batchSimulate,
        analyzeImpact,
        clearResults,
        clearError,
    };
}
// ============================================================================
// Combined Hook
// ============================================================================
/**
 * Combined hook for full policy management
 */
function usePolicyManagement(initialFilters = {}) {
    const list = usePolicies(initialFilters);
    const operations = usePolicyOperations();
    const simulator = usePolicySimulator();
    return {
        list,
        operations,
        simulator,
    };
}
exports.default = usePolicyManagement;
