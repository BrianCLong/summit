/**
 * ID generation utilities
 */

import { randomUUID } from 'crypto';

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Validate a UUID format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
