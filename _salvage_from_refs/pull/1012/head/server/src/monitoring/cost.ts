export interface Usage {
  cpuSec: number;
  memGbSec: number;
  storageBytes: number;
}

const RATES = { cpuSec: 0.000011, memGbSec: 0.000002, storageByte: 0.0000000001 };

export function estimateCost(u: Usage) {
  return (
    u.cpuSec * RATES.cpuSec +
    u.memGbSec * RATES.memGbSec +
    u.storageBytes * RATES.storageByte
  );
}

export function printCostReport(usages: Usage[]) {
  const total = usages.reduce((sum, u) => sum + estimateCost(u), 0);
  console.log(`24h cost estimate: $${total.toFixed(2)}`);
}
