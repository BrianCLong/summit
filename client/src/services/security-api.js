/**
 * Security Management API Client
 *
 * Frontend API client for security and privacy features.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC6.7 (Encryption)
 *
 * @module services/security-api
 */

const API_BASE = '/api/security';

/**
 * Get auth headers
 */
const getHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Handle API response
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
};

/**
 * Key Management API
 */
export const KeyManagementAPI = {
  /**
   * List encryption keys
   */
  async listKeys(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.purpose) queryParams.set('purpose', params.purpose);
    if (params.status) queryParams.set('status', params.status);

    const response = await fetch(`${API_BASE}/keys?${queryParams}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Generate a new key
   */
  async generateKey(purpose, algorithm) {
    const response = await fetch(`${API_BASE}/keys`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ purpose, algorithm }),
    });
    return handleResponse(response);
  },

  /**
   * Rotate a key
   */
  async rotateKey(keyId, reason) {
    const response = await fetch(`${API_BASE}/keys/${keyId}/rotate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /**
   * Retire a key
   */
  async retireKey(keyId, reason) {
    const response = await fetch(`${API_BASE}/keys/${keyId}/retire`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /**
   * Mark key as compromised
   */
  async markCompromised(keyId, reason) {
    const response = await fetch(`${API_BASE}/keys/${keyId}/compromise`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /**
   * Get keys nearing expiration
   */
  async getExpiringKeys(days = 14) {
    const response = await fetch(`${API_BASE}/keys/expiring?days=${days}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get rotation history
   */
  async getRotationHistory(keyId) {
    const params = keyId ? `?keyId=${keyId}` : '';
    const response = await fetch(`${API_BASE}/keys/history${params}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get rotation policies
   */
  async getRotationPolicies() {
    const response = await fetch(`${API_BASE}/policies/rotation`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Update rotation policy
   */
  async updateRotationPolicy(purpose, policy) {
    const response = await fetch(`${API_BASE}/policies/rotation/${purpose}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(policy),
    });
    return handleResponse(response);
  },
};

/**
 * PII Detection API
 */
export const PIIDetectionAPI = {
  /**
   * Scan data for PII
   */
  async scan(data, type = 'object', includeValue = false) {
    const response = await fetch(`${API_BASE}/pii/scan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ data, type, includeValue }),
    });
    return handleResponse(response);
  },

  /**
   * Get PII categories
   */
  async getCategories() {
    const response = await fetch(`${API_BASE}/pii/categories`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Mask a PII value
   */
  async mask(value, category) {
    const response = await fetch(`${API_BASE}/pii/mask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ value, category }),
    });
    return handleResponse(response);
  },
};

export default {
  Keys: KeyManagementAPI,
  PII: PIIDetectionAPI,
};
