/**
 * Generates a deterministic evidence ID based on a prefix and a set of key-value parts.
 * The parts are sorted by key to ensure stability.
 */
export function makeEvidenceId(prefix: string, parts: Record<string, string>): string {
  const stable = Object.keys(parts)
    .sort()
    .map(k => `${k}=${parts[k]}`)
    .join("|");
  return `${prefix}:${stable}`;
}

/**
 * Validates an evidence ID against the policy format.
 */
export function validateEvidenceId(id: string): boolean {
  // Simple check: PREFIX:k=v|k=v...
  const parts = id.split(':');
  if (parts.length < 2) return false;
  return true;
}
