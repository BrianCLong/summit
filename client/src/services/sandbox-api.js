/**
 * Sandbox Testing API Client
 *
 * Frontend API client for sandbox testing environment.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC8.1 (Change Management)
 *
 * @module services/sandbox-api
 */

const API_BASE = "/api/sandbox";

const getHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
};

export const SandboxAPI = {
  /**
   * Create a new sandbox
   */
  async create(data) {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * List all sandboxes
   */
  async list() {
    const response = await fetch(API_BASE, { headers: getHeaders() });
    return handleResponse(response);
  },

  /**
   * Get sandbox by ID
   */
  async get(sandboxId) {
    const response = await fetch(`${API_BASE}/${sandboxId}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update sandbox
   */
  async update(sandboxId, data) {
    const response = await fetch(`${API_BASE}/${sandboxId}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Delete sandbox
   */
  async delete(sandboxId) {
    const response = await fetch(`${API_BASE}/${sandboxId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Add scenario to sandbox
   */
  async addScenario(sandboxId, scenario) {
    const response = await fetch(`${API_BASE}/${sandboxId}/scenarios`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(scenario),
    });
    return handleResponse(response);
  },

  /**
   * Execute sandbox
   */
  async execute(sandboxId, options = {}) {
    const response = await fetch(`${API_BASE}/${sandboxId}/execute`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(options),
    });
    return handleResponse(response);
  },

  /**
   * Get execution result
   */
  async getExecution(executionId) {
    const response = await fetch(`${API_BASE}/executions/${executionId}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Clone policy into sandbox
   */
  async clonePolicy(sandboxId, policyData) {
    const response = await fetch(`${API_BASE}/${sandboxId}/clone-policy`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(policyData),
    });
    return handleResponse(response);
  },
};

export default SandboxAPI;
