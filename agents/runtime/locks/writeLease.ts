const leaseMap = new Map<string, string>();

export function acquireWriteLease(target: string, holder: string): void {
  if (leaseMap.has(target)) {
    throw new Error('WRITE_LEASE_CONFLICT');
  }
  leaseMap.set(target, holder);
}

export function releaseWriteLease(target: string, holder: string): void {
  if (leaseMap.get(target) === holder) {
    leaseMap.delete(target);
  }
}
