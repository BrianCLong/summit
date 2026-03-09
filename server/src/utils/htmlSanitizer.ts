// @ts-nocheck
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const jsdomWindow = new JSDOM('').window as unknown as typeof globalThis;
const DOMPurify = createDOMPurify(jsdomWindow);

/**
 * Sanitize HTML using DOMPurify with a locked-down profile suitable for server-side use.
 */
export function sanitizeHtml(value: string): string {
  const sanitized = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    USE_PROFILES: { html: true },
  });
  return typeof sanitized === 'string' ? sanitized : String(sanitized);
}

/**
 * Recursively sanitize unknown input, applying DOMPurify to any string leaf nodes.
 */
export function deepSanitize(input: unknown): unknown {
  if (typeof input === 'string') return sanitizeHtml(input);
  if (Array.isArray(input)) return input.map((entry) => deepSanitize(entry));
  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      sanitized[key] = deepSanitize(value);
    }
    return sanitized;
  }
  return input;
}
