import { DomainDefinition } from "./types.js";

export interface SloEvaluationInput {
  windowMinutes: number;
  totalRequests: number;
  failedRequests: number;
  p95LatencyMs: number;
}

export interface SloEvaluationResult {
  domain: string;
  availabilityMet: boolean;
  latencyMet: boolean;
  errorBudgetRemainingMinutes: number;
}

export function evaluateSlo(
  domain: DomainDefinition,
  input: SloEvaluationInput
): SloEvaluationResult {
  const availability =
    input.totalRequests === 0 ? 1 : 1 - input.failedRequests / input.totalRequests;
  const availabilityMet = availability >= domain.slo.availability;
  const latencyMet = input.p95LatencyMs <= domain.slo.latencyP95Ms;
  const errorBudgetBurned = Math.max(
    0,
    (domain.slo.availability - availability) * input.windowMinutes * 60
  );
  const errorBudgetRemainingMinutes = Math.max(
    domain.slo.errorBudgetMinutes - errorBudgetBurned / 60,
    0
  );

  return {
    domain: domain.name,
    availabilityMet,
    latencyMet,
    errorBudgetRemainingMinutes,
  };
}
