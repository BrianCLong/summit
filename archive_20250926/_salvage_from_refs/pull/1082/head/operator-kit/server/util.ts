import crypto from "crypto";

export function traceId() { return crypto.randomBytes(8).toString("hex"); }

export function p95(latencies: number[]): number {
  if (!latencies.length) return 0;
  const sorted = [...latencies].sort((a,b)=>a-b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
