/**
 * API Client with Deprecation Warning Support
 *
 * This client wraps the fetch API and automatically detects deprecation
 * headers, logging warnings and notifying developers about upcoming changes.
 */

export interface ApiClientConfig {
  baseUrl: string;
  apiVersion?: string;
  onDeprecationWarning?: (warning: DeprecationWarning) => void;
}

export interface DeprecationWarning {
  endpoint: string;
  sunsetDate: string | null;
  message: string;
  successorUrl: string | null;
  daysUntilSunset: number | null;
}

/**
 * API client with built-in deprecation warning handling
 */
export class ApiClient {
  private config: ApiClientConfig;
  private deprecationWarnings: Map<string, DeprecationWarning> = new Map();

  constructor(config: ApiClientConfig) {
    this.config = {
      apiVersion: 'v2.0.0',
      ...config
    };
  }

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    // Add API version header
    const headers = {
      'Content-Type': 'application/json',
      'API-Version': this.config.apiVersion!,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Check for deprecation headers
    this.handleDeprecationHeaders(endpoint, response);

    // Handle 410 Gone (sunset endpoint)
    if (response.status === 410) {
      const errorData = await response.json();
      throw new Error(
        `Endpoint ${endpoint} has been removed. ${errorData.message} ` +
        `Migrate to: ${errorData.successorUrl}`
      );
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private handleDeprecationHeaders(endpoint: string, response: Response) {
    const deprecationHeader = response.headers.get('Deprecation');

    if (deprecationHeader === 'true') {
      const sunsetDate = response.headers.get('Sunset');
      const warningHeader = response.headers.get('Warning');
      const linkHeader = response.headers.get('Link');

      // Calculate days until sunset
      let daysUntilSunset: number | null = null;
      if (sunsetDate) {
        const sunset = new Date(sunsetDate);
        const now = new Date();
        daysUntilSunset = Math.ceil((sunset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Extract successor URL from Link header
      let successorUrl: string | null = null;
      if (linkHeader) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="successor-version"/);
        if (match) {
          successorUrl = match[1];
        }
      }

      // Extract warning message
      let message = 'This endpoint is deprecated';
      if (warningHeader) {
        const warningMatch = warningHeader.match(/299\s*-\s*"([^"]+)"/);
        if (warningMatch) {
          message = warningMatch[1];
        }
      }

      const warning: DeprecationWarning = {
        endpoint,
        sunsetDate,
        message,
        successorUrl,
        daysUntilSunset
      };

      // Only show console warning once per endpoint per session
      if (!this.deprecationWarnings.has(endpoint)) {
        this.deprecationWarnings.set(endpoint, warning);

        // Determine console style based on urgency
        let style = 'color: orange; font-weight: bold; font-size: 14px;';
        if (daysUntilSunset !== null && daysUntilSunset <= 7) {
          style = 'color: red; font-weight: bold; font-size: 16px;';
        }

        console.warn(
          `%c⚠️ API DEPRECATION WARNING`,
          style,
          `\nEndpoint: ${endpoint}`,
          sunsetDate ? `\nSunset Date: ${sunsetDate}` : '',
          daysUntilSunset !== null ? `\nDays Until Removal: ${daysUntilSunset}` : '',
          `\n${message}`,
          successorUrl ? `\nMigrate to: ${successorUrl}` : '',
          '\n\nThis warning will only be shown once per session.'
        );
      }

      // Call custom handler if provided
      if (this.config.onDeprecationWarning) {
        this.config.onDeprecationWarning(warning);
      }
    }
  }

  /**
   * Get all deprecation warnings encountered in this session
   */
  getDeprecationWarnings(): DeprecationWarning[] {
    return Array.from(this.deprecationWarnings.values());
  }

  /**
   * Clear deprecation warning cache (useful for testing)
   */
  clearDeprecationWarnings(): void {
    this.deprecationWarnings.clear();
  }
}

// Example usage
export function createApiClient(): ApiClient {
  return new ApiClient({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:4000',
    apiVersion: 'v2.0.0',
    onDeprecationWarning: (warning) => {
      // Send to error tracking service (e.g., Sentry)
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureMessage('API Deprecation Warning', {
          level: 'warning',
          extra: warning
        });
      }

      // Log to analytics
      if (typeof window !== 'undefined' && (window as any).analytics) {
        (window as any).analytics.track('API Deprecation Warning', {
          endpoint: warning.endpoint,
          daysUntilSunset: warning.daysUntilSunset,
          successorUrl: warning.successorUrl
        });
      }
    }
  });
}

// Singleton instance
let apiClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = createApiClient();
  }
  return apiClient;
}

// Example usage in a component
/*
import { getApiClient } from './services/api-client-with-deprecation';

async function fetchRuns() {
  try {
    const client = getApiClient();
    const response = await client.fetch('/api/maestro/v2/runs?page=1&pageSize=20');
    return response;
  } catch (error) {
    console.error('Failed to fetch runs:', error);
    throw error;
  }
}
*/
