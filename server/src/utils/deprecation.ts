import { logger } from './logger.js';

const warned = new Set<string>();

/**
 * Log a deprecation warning.
 * @param message The message explaining the deprecation and alternative.
 * @param code Optional unique code for the deprecation.
 */
export function deprecate(message: string, code?: string) {
  const key = code || message;
  if (warned.has(key)) return;
  warned.add(key);

  logger.warn({ type: 'deprecation', code }, message);
}
