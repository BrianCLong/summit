/**
 * Server-side analytics utilities
 */

import type { AnalyticsEvent } from './events';

/**
 * Log an analytics event on the server
 * In production, this would be replaced with a durable sink
 * (database, log drain, data warehouse, etc.)
 */
export function logAnalyticsEvent(event: AnalyticsEvent): void {
  // For live testing: log to server console
  // Next step: swap for durable storage
  console.log('analytics_event', JSON.stringify(event));
}
