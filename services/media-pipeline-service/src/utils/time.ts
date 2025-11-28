/**
 * Time Utilities
 */

/**
 * Get current timestamp in ISO format
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Convert milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Parse ISO timestamp to milliseconds
 */
export function parseTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

/**
 * Calculate duration between two timestamps
 */
export function calculateDuration(start: string, end: string): number {
  return parseTimestamp(end) - parseTimestamp(start);
}

/**
 * Add duration to timestamp
 */
export function addDuration(timestamp: string, durationMs: number): string {
  return new Date(parseTimestamp(timestamp) + durationMs).toISOString();
}

/**
 * Check if timestamp is expired
 */
export function isExpired(expiresAt: string): boolean {
  return parseTimestamp(expiresAt) < Date.now();
}

/**
 * Get expiration timestamp based on retention days
 */
export function getExpirationDate(retentionDays: number): string {
  const expirationMs = Date.now() + retentionDays * 24 * 60 * 60 * 1000;
  return new Date(expirationMs).toISOString();
}
