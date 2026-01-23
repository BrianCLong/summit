/**
 * Integration Management Hooks
 *
 * React hooks for integration management operations.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration)
 *
 * @module hooks/useIntegrations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  IntegrationCatalogAPI,
  IntegrationAPI,
  IntegrationApprovalAPI,
  IntegrationAuditAPI,
} from '../services/integration-api';

/**
 * Hook for listing available integration types
 */
export function useIntegrationCatalog() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await IntegrationCatalogAPI.listAvailable();
      setIntegrations(response.data || []);
    } catch (err) {
      setError(err.message);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { integrations, loading, error, refresh: fetchCatalog };
}

/**
 * Hook for listing configured integrations
 */
export function useIntegrations(initialFilters = {}) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await IntegrationAPI.list(filters);
      setIntegrations(response.data || []);
    } catch (err) {
      setError(err.message);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    integrations,
    loading,
    error,
    filters,
    updateFilters,
    refresh: fetchIntegrations,
  };
}

/**
 * Hook for integration detail
 */
export function useIntegrationDetail(integrationId) {
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIntegration = useCallback(async () => {
    if (!integrationId) {
      setIntegration(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await IntegrationAPI.get(integrationId);
      setIntegration(response.data);
    } catch (err) {
      setError(err.message);
      setIntegration(null);
    } finally {
      setLoading(false);
    }
  }, [integrationId]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  return { integration, loading, error, refresh: fetchIntegration };
}

/**
 * Hook for integration operations
 */
export function useIntegrationOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setup = useCallback(async (manifestId, name, config = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await IntegrationAPI.setup(manifestId, name, config);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const connect = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const result = await IntegrationAPI.connect(id);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const result = await IntegrationAPI.disconnect(id);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const execute = useCallback(async (id, capability, params = {}, simulation = false) => {
    try {
      setLoading(true);
      setError(null);
      const result = await IntegrationAPI.execute(id, capability, params, simulation);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, setup, connect, disconnect, execute };
}

/**
 * Hook for approval workflow
 */
export function useIntegrationApprovals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await IntegrationApprovalAPI.listPending();
      setApprovals(response.data || []);
    } catch (err) {
      setError(err.message);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const approve = useCallback(async (id, comment) => {
    try {
      setProcessing(true);
      setError(null);
      await IntegrationApprovalAPI.approve(id, comment);
      await fetchApprovals();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [fetchApprovals]);

  const reject = useCallback(async (id, comment) => {
    try {
      setProcessing(true);
      setError(null);
      await IntegrationApprovalAPI.reject(id, comment);
      await fetchApprovals();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, [fetchApprovals]);

  return {
    approvals,
    loading,
    error,
    processing,
    approve,
    reject,
    refresh: fetchApprovals,
  };
}

/**
 * Hook for integration audit log
 */
export function useIntegrationAudit(params = {}) {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await IntegrationAuditAPI.getLog(params);
      setAuditLog(response.data || []);
    } catch (err) {
      setError(err.message);
      setAuditLog([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  return { auditLog, loading, error, refresh: fetchAuditLog };
}
