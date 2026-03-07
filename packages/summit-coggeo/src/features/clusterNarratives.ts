import type { NarrativeCandidate } from '../extract/extractSignals';

export interface Narrative {
  id: string;
  title: string;
  summary: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
  confidence: number;
}

export interface NarrativeClusterResult {
  narratives: Narrative[];
  membership: Array<{ obs_id: string; narrative_id: string }>;
}

/**
 * Cluster narrative candidates into stable Narrative nodes.
 *
 * TODO: Replace with Qdrant embedding + clustering + temporal cohesion.
 *       Current stub: 1:1 candidate → narrative (no deduplication).
 */
export function clusterNarratives(cands: NarrativeCandidate[]): NarrativeClusterResult {
  const narratives: Narrative[] = cands.map((c) => ({
    id: `nar:${c.id.replace('narCand:', '')}`,
    title: c.title,
    summary: c.summary,
    first_seen: c.ts,
    last_seen: c.ts,
    tags: c.tags ?? [],
    confidence: Math.max(0.01, c.confidence),
  }));

  const membership = cands.map((c, i) => ({
    obs_id: c.obs_id,
    narrative_id: narratives[i]!.id,
  }));

  return { narratives, membership };
}
