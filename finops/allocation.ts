export type CostBucket = "compute" | "storage" | "egress" | "third_party";

export interface MeteringRatios {
  computePerUnitUsd: number;
  storagePerGbHourUsd: number;
  egressPerGbUsd: number;
  thirdPartyPerRequestUsd: number;
}

export interface MeteredUsage {
  computeUnits: number;
  storageGbHours: number;
  egressGb: number;
  thirdPartyRequests: number;
}

export interface AllocationBreakdown {
  bucket: CostBucket;
  costUsd: number;
  units: number;
  allocationPct: number;
}

export interface AllocationResult {
  totalCostUsd: number;
  buckets: AllocationBreakdown[];
  unitCosts: {
    costPerComputeUnit: number;
    costPerGbHour: number;
    costPerEgressGb: number;
    costPerThirdPartyRequest: number;
  };
  meteringApplied: MeteringRatios;
}

export const defaultMeteringRatios: MeteringRatios = {
  computePerUnitUsd: 0.0025, // $/compute unit
  storagePerGbHourUsd: 0.00012, // $/GB-hour
  egressPerGbUsd: 0.09, // $/GB transferred
  thirdPartyPerRequestUsd: 0.0004, // $/3p API call
};

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function allocateCostBuckets(
  usage: MeteredUsage,
  ratios: MeteringRatios = defaultMeteringRatios
): AllocationResult {
  const computeCost = roundCurrency((usage.computeUnits || 0) * ratios.computePerUnitUsd);
  const storageCost = roundCurrency((usage.storageGbHours || 0) * ratios.storagePerGbHourUsd);
  const egressCost = roundCurrency((usage.egressGb || 0) * ratios.egressPerGbUsd);
  const thirdPartyCost = roundCurrency(
    (usage.thirdPartyRequests || 0) * ratios.thirdPartyPerRequestUsd
  );

  const totalCost = computeCost + storageCost + egressCost + thirdPartyCost || 0;

  const buckets: AllocationBreakdown[] = [
    { bucket: "compute" as CostBucket, costUsd: computeCost, units: usage.computeUnits },
    { bucket: "storage" as CostBucket, costUsd: storageCost, units: usage.storageGbHours },
    { bucket: "egress" as CostBucket, costUsd: egressCost, units: usage.egressGb },
    {
      bucket: "third_party" as CostBucket,
      costUsd: thirdPartyCost,
      units: usage.thirdPartyRequests,
    },
  ].map((entry) => ({
    ...entry,
    allocationPct: totalCost > 0 ? Math.round((entry.costUsd / totalCost) * 10000) / 100 : 0,
  }));

  return {
    totalCostUsd: roundCurrency(totalCost),
    buckets,
    unitCosts: {
      costPerComputeUnit: usage.computeUnits > 0 ? computeCost / usage.computeUnits : 0,
      costPerGbHour: usage.storageGbHours > 0 ? storageCost / usage.storageGbHours : 0,
      costPerEgressGb: usage.egressGb > 0 ? egressCost / usage.egressGb : 0,
      costPerThirdPartyRequest:
        usage.thirdPartyRequests > 0 ? thirdPartyCost / usage.thirdPartyRequests : 0,
    },
    meteringApplied: ratios,
  };
}
