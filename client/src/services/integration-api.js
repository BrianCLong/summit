/**
 * Integration Management API Client
 *
 * Frontend API client for integration management.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration)
 *
 * @module services/integration-api
 */

const API_BASE = "/api/integrations";

/**
 * Get auth headers
 */
const getHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
};

/**
 * Integration Catalog API
 */
export const IntegrationCatalogAPI = {
  /**
   * List available integration types
   */
  async listAvailable() {
    const response = await fetch(`${API_BASE}/catalog`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

/**
 * Integration Management API
 */
export const IntegrationAPI = {
  /**
   * List configured integrations
   */
  async list(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.set("status", params.status);
    if (params.category) queryParams.set("category", params.category);

    const response = await fetch(`${API_BASE}?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get a specific integration
   */
  async get(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Set up a new integration
   */
  async setup(manifestId, name, config = {}) {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ manifestId, name, config }),
    });
    return handleResponse(response);
  },

  /**
   * Connect an integration
   */
  async connect(id) {
    const response = await fetch(`${API_BASE}/${id}/connect`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Disconnect an integration
   */
  async disconnect(id) {
    const response = await fetch(`${API_BASE}/${id}/disconnect`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Execute an integration action
   */
  async execute(id, capability, params = {}, simulation = false) {
    const response = await fetch(`${API_BASE}/${id}/execute`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ capability, params, simulation }),
    });
    return handleResponse(response);
  },
};

/**
 * Integration Approval API
 */
export const IntegrationApprovalAPI = {
  /**
   * List pending approvals
   */
  async listPending() {
    const response = await fetch(`${API_BASE}/approvals/pending`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Approve a request
   */
  async approve(id, comment) {
    const response = await fetch(`${API_BASE}/approvals/${id}/approve`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ comment }),
    });
    return handleResponse(response);
  },

  /**
   * Reject a request
   */
  async reject(id, comment) {
    const response = await fetch(`${API_BASE}/approvals/${id}/reject`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ comment }),
    });
    return handleResponse(response);
  },
};

/**
 * Integration Audit API
 */
export const IntegrationAuditAPI = {
  /**
   * Get audit log
   */
  async getLog(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.integrationId) queryParams.set("integrationId", params.integrationId);
    if (params.from) queryParams.set("from", params.from);
    if (params.to) queryParams.set("to", params.to);

    const response = await fetch(`${API_BASE}/audit?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default {
  Catalog: IntegrationCatalogAPI,
  Integration: IntegrationAPI,
  Approval: IntegrationApprovalAPI,
  Audit: IntegrationAuditAPI,
};
