
import { DataEnvelope } from '../utils/data-envelope-validator';

export interface ApiRequestOptions extends RequestInit {
  purpose?: string;
  reasonForAccess?: string;
}

/**
 * Standardized API Client for Runtime Governance
 * Wraps fetch to inject governance headers and handle errors
 */
export async function apiClient<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { purpose, reasonForAccess, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  // Inject Governance Headers
  if (!headers.has('X-Purpose')) {
    headers.set('X-Purpose', purpose || 'general_access');
  }
  if (reasonForAccess && !headers.has('X-Reason-For-Access')) {
    headers.set('X-Reason-For-Access', reasonForAccess);
  }

  // Ensure JSON content type if body is present
  if (fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // Handle Global Governance Errors
  if (response.status === 503) {
    const data = await response.json().catch(() => ({}));
    if (data.reason === 'KILL_SWITCH') {
        throw new Error(`Service Unavailable: ${data.message || 'Kill Switch Active'}`);
    }
  }

  if (response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.error === 'tenant_denied') {
        throw new Error(`Access Denied: ${data.message}`);
    }
  }

  if (!response.ok) {
     throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  // Parse Response
  // Check if it's a data envelope
  const json = await response.json();
  // We could use validateDataEnvelope here if we wanted strict client-side validation

  return json;
}
