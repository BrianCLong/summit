const PII = [/\b\d{3}-\d{2}-\d{4}\b/i, /@/, /credit\s*card/i];
export function scrub(text: string) {
  return PII.some((r) => r.test(text)) ? '[REDACTED]' : text;
}
