import { MemoryTier } from './types';

export const MEMORY_ORCH_ENABLED = false;

export function routeMemory(content: string): MemoryTier {
  if (!MEMORY_ORCH_ENABLED) return 'cold';
  return 'hot';
}
