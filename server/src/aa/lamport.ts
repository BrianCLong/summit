let L = 0;
export function nextLamport(remote?: number) {
  L = Math.max(L, remote || 0) + 1;
  return L;
}
