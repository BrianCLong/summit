/**
 * URL configuration helpers for IntelGraph Platform
 * Provides functions to get various service URLs based on environment
 */

/**
 * Get the base API URL
 * @returns {string} The API base URL
 */
export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ||
         (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
}

/**
 * Get the GraphQL HTTP endpoint URL
 * @returns {string} The GraphQL HTTP URL
 */
export function getGraphqlHttpUrl() {
  return import.meta.env.VITE_GRAPHQL_HTTP_URL ||
         `${getApiBaseUrl()}/graphql`;
}

/**
 * Get the WebSocket base URL for real-time connections
 * @returns {string} The WebSocket base URL
 */
export function getSocketBaseUrl() {
  const baseUrl = getApiBaseUrl();
  return baseUrl.replace(/^http/, 'ws');
}

/**
 * Get the GraphQL WebSocket endpoint URL
 * @returns {string} The GraphQL WebSocket URL
 */
export function getGraphqlWsUrl() {
  return import.meta.env.VITE_GRAPHQL_WS_URL ||
         `${getSocketBaseUrl()}/graphql`;
}

/**
 * Get the Grafana dashboard URL
 * @returns {string} The Grafana URL
 */
export function getGrafanaUrl() {
  return import.meta.env.VITE_GRAFANA_URL ||
         'http://localhost:3001';
}

/**
 * Get the Jaeger tracing URL
 * @returns {string} The Jaeger URL
 */
export function getJaegerUrl() {
  return import.meta.env.VITE_JAEGER_URL ||
         'http://localhost:16686';
}
