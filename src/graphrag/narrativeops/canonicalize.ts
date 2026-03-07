/**
 * Canonicalize text for deterministic downstream metrics.
 * NOTE: keep conservative to avoid semantic drift (no stemming/lemmatization in Lane 1).
 */
export function canonicalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}
