export type MemoryTier = 'hot' | 'warm' | 'cold' | 'archive';

export interface MemoryItem {
  id: string;
  tier: MemoryTier;
  content: string;
}
