/**
 * Represents the input factors for calculating risk.
 */
export type RiskInputs = {
  /** Policy configuration. */
  policy?: any;
  /** Quota status. */
  quotas?: { over?: boolean };
  /** Differential privacy budget status. */
  dp?: { exhausted?: boolean };
  /** Whether data residency requirements are met. */
  residencyOk: boolean;
  /** Simulator results. */
  simulator: { deny: number; requireHuman: number };
};

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

/**
 * Calculates a risk score based on various inputs.
 * The score ranges from 0 to 1.
 *
 * @param r - The risk inputs.
 * @returns The calculated risk score.
 */
export function riskScore(r: RiskInputs) {
  let s = 0;
  if (!r.residencyOk) s += 0.5;
  s += clamp(r.simulator.deny * 0.6 + r.simulator.requireHuman * 0.3, 0, 1);
  s += r.quotas?.over ? 0.2 : 0;
  s += r.dp?.exhausted ? 0.2 : 0;
  return Math.min(1, s);
}

/**
 * Makes an admission decision based on the risk score and configured thresholds.
 *
 * @param score - The calculated risk score.
 * @param t - The threshold configuration (warn, requireHuman, deny).
 * @returns An object containing the action ('allow', 'warn', 'require-human', 'deny') and an optional reason.
 */
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
