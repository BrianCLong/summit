import { getRevocation, cacheRevocation } from './store.js';

export const isRevoked = (id: string, revokedAt?: Date) => {
  const cached = getRevocation(id);
  if (cached) return true;
  if (revokedAt) {
    cacheRevocation(id, revokedAt);
    return true;
  }
  return false;
};
