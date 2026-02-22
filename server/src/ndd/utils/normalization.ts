import { createHash } from 'crypto';

/**
 * Normalizes text for consistent analysis.
 * - NFKC unicode normalization
 * - Lowercase
 * - Remove non-alphanumeric chars (except whitespace)
 * - Collapse whitespace
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates a stable SHA-256 hash for content.
 */
export function stableHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
