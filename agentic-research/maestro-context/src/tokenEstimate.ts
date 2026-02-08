// Deterministic approximation; swap to provider tokenizer if available.
export function roughTokenEstimate(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
