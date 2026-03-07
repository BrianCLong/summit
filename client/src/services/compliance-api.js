/**
 * Compliance Management API Client
 *
 * Frontend API client for compliance automation.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module services/compliance-api
 */

const API_BASE = "/api/compliance";

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

export const ComplianceAPI = {
  async getFrameworks() {
    const response = await fetch(`${API_BASE}/frameworks`, { headers: getHeaders() });
    return handleResponse(response);
  },

  async getControls(framework, category) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const response = await fetch(`${API_BASE}/frameworks/${framework}/controls?${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async assessControl(framework, controlId) {
    const response = await fetch(`${API_BASE}/frameworks/${framework}/assess/${controlId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getAssessments(framework) {
    const response = await fetch(`${API_BASE}/frameworks/${framework}/assessments`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getSummary(framework) {
    const response = await fetch(`${API_BASE}/frameworks/${framework}/summary`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getReadiness(framework) {
    const response = await fetch(`${API_BASE}/frameworks/${framework}/readiness`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getEvidence(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && queryParams.set(k, v));
    const response = await fetch(`${API_BASE}/evidence?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async collectEvidence(data) {
    const response = await fetch(`${API_BASE}/evidence`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getEvidenceStatus(framework) {
    const params = framework ? `?framework=${framework}` : "";
    const response = await fetch(`${API_BASE}/evidence/status${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default ComplianceAPI;
