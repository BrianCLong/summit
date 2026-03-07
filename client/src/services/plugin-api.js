/**
 * Plugin Management API Client
 *
 * Frontend API client for plugin management.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration)
 *
 * @module services/plugin-api
 */

const API_BASE = "/api/plugins";

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
 * Plugin Management API
 */
export const PluginAPI = {
  /**
   * List all plugins
   */
  async listPlugins(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.category) queryParams.set("category", params.category);
    if (params.status) queryParams.set("status", params.status);
    if (params.search) queryParams.set("search", params.search);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));

    const response = await fetch(`${API_BASE}?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get a specific plugin
   */
  async getPlugin(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Enable a plugin for the tenant
   */
  async enablePlugin(id, config = {}) {
    const response = await fetch(`${API_BASE}/${id}/enable`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ config }),
    });
    return handleResponse(response);
  },

  /**
   * Disable a plugin for the tenant
   */
  async disablePlugin(id) {
    const response = await fetch(`${API_BASE}/${id}/disable`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Execute a plugin action
   */
  async executeAction(id, action, params = {}, simulation = false) {
    const response = await fetch(`${API_BASE}/${id}/execute`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ action, params, simulation }),
    });
    return handleResponse(response);
  },

  /**
   * Get tenant-specific plugin configuration
   */
  async getConfig(id) {
    const response = await fetch(`${API_BASE}/${id}/config`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update tenant-specific plugin configuration
   */
  async updateConfig(id, config, enabled = true) {
    const response = await fetch(`${API_BASE}/${id}/config`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ config, enabled }),
    });
    return handleResponse(response);
  },

  /**
   * Get plugin health status
   */
  async getHealth(id) {
    const response = await fetch(`${API_BASE}/${id}/health`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(id) {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default PluginAPI;
