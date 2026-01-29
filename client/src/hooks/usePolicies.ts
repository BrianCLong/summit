/**
 * Policy Management Hook
 *
 * React hook for managing governance policies with optimistic updates.
 *
 * SOC 2 Controls: CC6.1, CC6.2, CC7.2, PI1.1
 *
 * @module hooks/usePolicies
 */

import { useState, useCallback, useEffect } from 'react';
import {
  PolicyAPI,
  PolicySimulatorAPI,
  ManagedPolicy,
  PolicyVersion,
  PolicyApprovalRequest,
  CreatePolicyInput,
  UpdatePolicyInput,
  PolicyListFilters,
  SimulationRequest,
  SimulationContext,
  SimulationResult,
  BatchSimulationResult,
  ImpactAnalysis,
} from '../services/policy-api';

// ============================================================================
// Types
// ============================================================================

export interface UsePoliciesState {
  policies: ManagedPolicy[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UsePolicyDetailState {
  policy: ManagedPolicy | null;
  versions: PolicyVersion[];
  loading: boolean;
  error: string | null;
}

export interface UseSimulatorState {
  result: SimulationResult | null;
  batchResult: BatchSimulationResult | null;
  impactAnalysis: ImpactAnalysis | null;
  loading: boolean;
  error: string | null;
}

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

// ============================================================================
// Policy List Hook
// ============================================================================

/**
 * Hook for managing policy list with pagination and filtering
 */
export function usePolicies(initialFilters: PolicyListFilters = {}) {
  const [state, setState] = useState<UsePoliciesState>({
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

  const [filters, setFilters] = useState<PolicyListFilters>(initialFilters);

  const fetchPolicies = useCallback(async (filterOverrides?: PolicyListFilters) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const appliedFilters = { ...filters, ...filterOverrides };
      const response = await PolicyAPI.listPolicies(appliedFilters);
      setState({
        policies: response.data.policies,
        loading: false,
        error: null,
        pagination: response.data.pagination,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to fetch policies'),
      }));
    }
  }, [filters]);

  const refresh = useCallback(() => fetchPolicies(), [fetchPolicies]);

  const updateFilters = useCallback((newFilters: Partial<PolicyListFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    fetchPolicies(updated);
  }, [filters, fetchPolicies]);

  const goToPage = useCallback((page: number) => {
    updateFilters({ page });
  }, [updateFilters]);

  // Initial load
  useEffect(() => {
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
export function usePolicyDetail(policyId: string | null) {
  const [state, setState] = useState<UsePolicyDetailState>({
    policy: null,
    versions: [],
    loading: false,
    error: null,
  });

  const fetchPolicy = useCallback(async () => {
    if (!policyId) {
      setState({ policy: null, versions: [], loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [policyResponse, versionsResponse] = await Promise.all([
        PolicyAPI.getPolicy(policyId),
        PolicyAPI.listVersions(policyId),
      ]);
      setState({
        policy: policyResponse.data,
        versions: versionsResponse.data.versions,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Failed to fetch policy'),
      }));
    }
  }, [policyId]);

  const refresh = useCallback(() => fetchPolicy(), [fetchPolicy]);

  // Load when policyId changes
  useEffect(() => {
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
export function usePolicyOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPolicy = useCallback(async (input: CreatePolicyInput): Promise<ManagedPolicy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await PolicyAPI.createPolicy(input);
      setLoading(false);
      if (response.data.success) {
        return response.data.policy;
      }
      return null;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create policy'));
      setLoading(false);
      return null;
    }
  }, []);

  const updatePolicy = useCallback(async (
    policyId: string,
    input: UpdatePolicyInput
  ): Promise<ManagedPolicy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await PolicyAPI.updatePolicy(policyId, input);
      setLoading(false);
      if (response.data.success) {
        return response.data.policy;
      }
      return null;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update policy'));
      setLoading(false);
      return null;
    }
  }, []);

  const deletePolicy = useCallback(async (policyId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await PolicyAPI.deletePolicy(policyId);
      setLoading(false);
      return response.data.success;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete policy'));
      setLoading(false);
      return false;
    }
  }, []);

  const rollbackPolicy = useCallback(async (
    policyId: string,
    targetVersion: number
  ): Promise<ManagedPolicy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await PolicyAPI.rollbackPolicy(policyId, targetVersion);
      setLoading(false);
      if (response.data.success) {
        return response.data.policy;
      }
      return null;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to rollback policy'));
      setLoading(false);
      return null;
    }
  }, []);

  const submitForApproval = useCallback(async (
    policyId: string,
    reason?: string
  ): Promise<PolicyApprovalRequest | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await PolicyAPI.submitForApproval(policyId, reason);
      setLoading(false);
      if (response.data.success) {
        return response.data.request;
      }
      return null;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit for approval'));
      setLoading(false);
      return null;
    }
  }, []);

  const approvePolicy = useCallback(async (
    policyId: string,
    notes?: string
  ): Promise<ManagedPolicy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await PolicyAPI.approvePolicy(policyId, notes);
      setLoading(false);
      if (response.data.success) {
        return response.data.policy;
      }
      return null;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to approve policy'));
      setLoading(false);
      return null;
    }
  }, []);

  const publishPolicy = useCallback(async (policyId: string): Promise<ManagedPolicy | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await PolicyAPI.publishPolicy(policyId);
      setLoading(false);
      if (response.data.success) {
        return response.data.policy;
      }
      return null;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to publish policy'));
      setLoading(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

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
export function usePolicySimulator() {
  const [state, setState] = useState<UseSimulatorState>({
    result: null,
    batchResult: null,
    impactAnalysis: null,
    loading: false,
    error: null,
  });

  const simulate = useCallback(async (request: SimulationRequest): Promise<SimulationResult | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await PolicySimulatorAPI.simulate(request);
      setState((prev) => ({
        ...prev,
        result: response.data,
        loading: false,
      }));
      return response.data;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Simulation failed'),
      }));
      return null;
    }
  }, []);

  const batchSimulate = useCallback(async (
    policy: SimulationRequest['policy'],
    contexts: SimulationContext[]
  ): Promise<BatchSimulationResult | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await PolicySimulatorAPI.batchSimulate(policy, contexts);
      setState((prev) => ({
        ...prev,
        batchResult: response.data,
        loading: false,
      }));
      return response.data;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Batch simulation failed'),
      }));
      return null;
    }
  }, []);

  const analyzeImpact = useCallback(async (
    currentPolicy: SimulationRequest['policy'],
    newPolicy: SimulationRequest['policy']
  ): Promise<ImpactAnalysis | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await PolicySimulatorAPI.analyzeImpact(currentPolicy, newPolicy);
      setState((prev) => ({
        ...prev,
        impactAnalysis: response.data,
        loading: false,
      }));
      return response.data;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(err, 'Impact analysis failed'),
      }));
      return null;
    }
  }, []);

  const clearResults = useCallback(() => {
    setState({
      result: null,
      batchResult: null,
      impactAnalysis: null,
      loading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
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
export function usePolicyManagement(initialFilters: PolicyListFilters = {}) {
  const list = usePolicies(initialFilters);
  const operations = usePolicyOperations();
  const simulator = usePolicySimulator();

  return {
    list,
    operations,
    simulator,
  };
}

export default usePolicyManagement;
