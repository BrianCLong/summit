export type RiskInputs = {
  policy?: any;
  quotas?: { over?: boolean };
  dp?: { exhausted?: boolean };
  residencyOk: boolean;
  simulator: { deny: number; requireHuman: number };
};

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

export function riskScore(r: RiskInputs) {
  let s = 0;
  if (!r.residencyOk) s += 0.5;
  s += clamp(r.simulator.deny * 0.6 + r.simulator.requireHuman * 0.3, 0, 1);
  s += r.quotas?.over ? 0.2 : 0;
  s += r.dp?.exhausted ? 0.2 : 0;
  return Math.min(1, s);
}

export function admissionDecision(
  score: number,
  t: { warn: number; requireHuman: number; deny: number },
) {
  if (score >= t.deny)
    return {
      action: 'deny',
      reason: `risk=${score.toFixed(2)} >= ${t.deny}`,
    } as const;
  if (score >= t.requireHuman)
    return {
      action: 'require-human',
      reason: `risk=${score.toFixed(2)}`,
    } as const;
  if (score >= t.warn)
    return { action: 'warn', reason: `risk=${score.toFixed(2)}` } as const;
  return { action: 'allow' } as const;
}
