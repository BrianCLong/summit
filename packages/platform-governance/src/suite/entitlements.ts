import { z } from "zod";

export const entitlementSchema = z.object({
  planId: z.string(),
  module: z.string(),
  feature: z.string(),
  limit: z.number().nonnegative(),
  rollover: z.boolean().default(false),
  expiresAt: z.date().optional(),
});

export type Entitlement = z.infer<typeof entitlementSchema>;

export const usageRecordSchema = z.object({
  tenantId: z.string(),
  feature: z.string(),
  count: z.number().nonnegative(),
  occurredAt: z.date(),
});

export type UsageRecord = z.infer<typeof usageRecordSchema>;

export interface EntitlementEvaluation {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

export function evaluateEntitlement(
  entitlement: Entitlement,
  usage: UsageRecord[]
): EntitlementEvaluation {
  const totalUsage = usage
    .filter((record) => record.feature === entitlement.feature)
    .reduce((sum, record) => sum + record.count, 0);

  const remaining = entitlement.limit - totalUsage;
  if (remaining < 0) {
    return { allowed: false, remaining, reason: "limit exceeded" };
  }

  if (entitlement.expiresAt && entitlement.expiresAt.getTime() < Date.now()) {
    return { allowed: false, remaining, reason: "entitlement expired" };
  }

  return { allowed: true, remaining };
}

export interface ProrationInput {
  oldLimit: number;
  newLimit: number;
  daysUsed: number;
  daysInPeriod: number;
}

export function calculateProratedCredit({
  oldLimit,
  newLimit,
  daysUsed,
  daysInPeriod,
}: ProrationInput): number {
  const unusedPortion = Math.max(oldLimit - (oldLimit * daysUsed) / daysInPeriod, 0);
  const additionalPortion = Math.max(
    (newLimit - oldLimit) * ((daysInPeriod - daysUsed) / daysInPeriod),
    0
  );
  return Math.round(unusedPortion + additionalPortion);
}

export interface Anomaly {
  feature: string;
  expected: number;
  actual: number;
}

export function detectUsageAnomalies(
  entitlement: Entitlement,
  usage: UsageRecord[],
  threshold = 2
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const totalUsage = usage
    .filter((record) => record.feature === entitlement.feature)
    .reduce((sum, record) => sum + record.count, 0);

  if (totalUsage > entitlement.limit * threshold) {
    anomalies.push({
      feature: entitlement.feature,
      expected: entitlement.limit,
      actual: totalUsage,
    });
  }

  return anomalies;
}
