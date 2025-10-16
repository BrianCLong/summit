export function rejectIfStale(tsHeader: string | undefined, maxSkewSec = 300) {
  const ts = Number(tsHeader ?? 0);
  if (!Number.isFinite(ts)) return true;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) > maxSkewSec;
}
