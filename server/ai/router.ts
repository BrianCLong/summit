export function pickModel(
  { tokens, risk }: { tokens: number; risk: number },
  remainingUSD: number,
) {
  if (remainingUSD < 0.1) return 'small';
  if (risk > 0.7 || tokens > 20_000) return 'large';
  if (risk > 0.4) return 'medium';
  return 'small';
}
