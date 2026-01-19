import { Drift } from '../diff/compare.js';

export function shouldPageP0(drift: Drift, threshold: number): boolean {
  return drift.parity < threshold;
}

export async function pageIfNeeded(drift: Drift, threshold: number) {
  if (!shouldPageP0(drift, threshold)) {
    return;
  }
  console.error(
    `[P0] Graph parity below threshold: parity=${drift.parity} threshold=${threshold}`,
  );
}
