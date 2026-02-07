export function assertTokenBudget(cfg: {
  maxInputTokens?: number;
  maxOutputTokens?: number;
}): void {
  if (!cfg.maxInputTokens || !cfg.maxOutputTokens) {
    throw new Error(
      'Token budget not configured (deny-by-default). Set MAX_INPUT_TOKENS and MAX_OUTPUT_TOKENS.',
    );
  }
}
