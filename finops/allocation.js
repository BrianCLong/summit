export const defaultMeteringRatios = {
  computePerUnitUsd: 0.0025, // $/compute unit
  storagePerGbHourUsd: 0.00012, // $/GB-hour
  egressPerGbUsd: 0.09, // $/GB transferred
  thirdPartyPerRequestUsd: 0.0004, // $/3p API call
};
function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
export function allocateCostBuckets(usage, ratios = defaultMeteringRatios) {
  const computeCost = roundCurrency((usage.computeUnits || 0) * ratios.computePerUnitUsd);
  const storageCost = roundCurrency((usage.storageGbHours || 0) * ratios.storagePerGbHourUsd);
  const egressCost = roundCurrency((usage.egressGb || 0) * ratios.egressPerGbUsd);
  const thirdPartyCost = roundCurrency(
    (usage.thirdPartyRequests || 0) * ratios.thirdPartyPerRequestUsd
  );
  const totalCost = computeCost + storageCost + egressCost + thirdPartyCost || 0;
  const buckets = [
    { bucket: "compute", costUsd: computeCost, units: usage.computeUnits },
    { bucket: "storage", costUsd: storageCost, units: usage.storageGbHours },
    { bucket: "egress", costUsd: egressCost, units: usage.egressGb },
    {
      bucket: "third_party",
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
//# sourceMappingURL=allocation.js.map
