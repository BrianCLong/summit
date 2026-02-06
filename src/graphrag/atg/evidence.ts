import { createHash } from 'crypto';

/**
 * Recursively stringifies an object with sorted keys to ensure determinism.
 */
function stableStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const parts = keys.map(key => {
    return JSON.stringify(key) + ':' + stableStringify(obj[key]);
  });

  return '{' + parts.join(',') + '}';
}

/**
 * Generates a deterministic Evidence ID (EVD-...) from the content.
 * Uses SHA-256 and stable JSON stringification.
 */
export function generateEvidenceId(content: any): string {
  const hash = createHash('sha256');
  const stableString = stableStringify(content);
  hash.update(stableString);
  // Use first 16 chars of hex digest for brevity but sufficient collision resistance for this scope
  return `EVD-${hash.digest('hex').substring(0, 16)}`;
}

/**
 * Verifies that the given Evidence ID matches the content.
 */
export function verifyEvidenceId(id: string, content: any): boolean {
  const generatedId = generateEvidenceId(content);
  return id === generatedId;
}
