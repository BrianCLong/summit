const leaseMap = new Map<string, string>();

export function acquireWriteLease(target: string, holder: string) {
  if (leaseMap.has(target) && leaseMap.get(target) !== holder) {
    throw new Error('WRITE_LEASE_CONFLICT');
  }
  leaseMap.set(target, holder);
}

export function releaseWriteLease(target: string, holder: string) {
  if (leaseMap.get(target) === holder) {
    leaseMap.delete(target);
  }
}

export function getLeaseHolder(target: string): string | undefined {
  return leaseMap.get(target);
}

export function clearAllLeases() {
  leaseMap.clear();
}
