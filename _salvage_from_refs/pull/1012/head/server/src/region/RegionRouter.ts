export type Region = 'us-west' | 'us-east' | 'eu-central';

export function resolveWriteRegion(
  tenantId: string,
  residencyAllowed: Region[],
  preferred: Region,
): Region {
  if (residencyAllowed.includes(preferred)) return preferred;
  if (residencyAllowed.length) return residencyAllowed[0];
  throw new Error('residency_blocked');
}
