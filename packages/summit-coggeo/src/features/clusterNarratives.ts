export interface Narrative {
  id: string;
  title: string;
  summary: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
  confidence: number;
}

export interface NarrativeCandidate {
  id: string;
  obs_id: string;
  ts: string;
  title: string;
  summary: string;
  tags: string[];
  confidence: number;
}

export function clusterNarratives(cands: NarrativeCandidate[]): { narratives: Narrative[]; membership: Array<{ obs_id: string; narrative_id: string }> } {
  const narratives: Narrative[] = cands.map((c) => ({
    id: `nar:${c.id.replace("narCand:", "")}`,
    title: c.title,
    summary: c.summary,
    first_seen: c.ts,
    last_seen: c.ts,
    tags: c.tags ?? [],
    confidence: Math.max(0.01, c.confidence),
  }));

  const membership = cands.map((c, i) => ({ obs_id: c.obs_id, narrative_id: narratives[i]!.id }));
  return { narratives, membership };
}
