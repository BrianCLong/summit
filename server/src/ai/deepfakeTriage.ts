export interface DeepfakeTriageResult {
  score: number;
  facets: string[];
  latencyMs: number;
}

function runInference(_media: Buffer): number {
  // Placeholder inference producing a deterministic but simple score
  return Math.floor(Math.random() * 101);
}

function explain(_media: Buffer): string[] {
  // Placeholder explanation facets
  return [];
}

export function deepfakeTriage(
  media: Buffer,
  meta: { latencyMs?: number } = {},
): DeepfakeTriageResult {
  const start = Date.now();
  const score = runInference(media);
  const facets = explain(media);
  const latencyMs = meta.latencyMs ?? Date.now() - start;
  return { score, facets, latencyMs };
}
