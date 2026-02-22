import { Architecture } from "./architectureSelector";

export interface StepResult { ok: boolean; }
export interface ErrorAmpMetrics {
  architecture: Architecture;
  steps: number;
  errors: number;
  errorRate: number;
  // “guardrail” rec based on containment intuition (centralized contains error propagation better than independent)
  recommended: Architecture;
}

export function errorAmplificationGuard(arch: Architecture, results: StepResult[]): ErrorAmpMetrics {
  const steps = results.length;
  const errors = results.filter(r => !r.ok).length;
  const errorRate = steps === 0 ? 0 : errors / steps;

  let recommended = arch;
  if (arch === "CENTRALIZED" && errorRate > 0.25) recommended = "SINGLE_AGENT";
  if (arch === "HYBRID" && errorRate > 0.30) recommended = "CENTRALIZED";
  if (arch === "SINGLE_AGENT" && errorRate > 0.20) recommended = "CENTRALIZED";

  return { architecture: arch, steps, errors, errorRate, recommended };
}
