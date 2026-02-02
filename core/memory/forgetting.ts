import { MemoryRecord } from './types';

/**
 * Implements "Mutual Forgetting" via a decay-based scoring.
 * Memories lose relevance over time unless reinforced.
 */
export function calculateRelevance(record: MemoryRecord): number {
  if (process.env.MEMORY_FORGETTING_ENABLED !== 'true') {
    return 1.0;
  }

  const now = Date.now();
  const ageInHours = (now - record.createdAt) / (1000 * 60 * 60);

  // Simple exponential decay: R = e^(-k * t)
  // k = 0.01 means ~50% relevance after 70 hours
  const k = 0.01;
  return Math.exp(-k * ageInHours);
}
