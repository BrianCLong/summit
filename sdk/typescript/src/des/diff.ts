import type { EmbeddingRecord } from './embeddingStore.js';

export interface DriftEntry {
  itemId: string;
  baselineVersion: string;
  candidateVersion: string;
  cosineSimilarity: number;
  cosineDelta: number;
}

export interface CosineDrift {
  entries: DriftEntry[];
  missingFromCandidate: string[];
  missingFromBaseline: string[];
  averageSimilarity: number;
}

const cosineSimilarity = (a: number[], b: number[]): number => {
  const dot = a.reduce((acc, value, index) => acc + value * b[index], 0);
  const normA = Math.sqrt(a.reduce((acc, value) => acc + value * value, 0));
  const normB = Math.sqrt(b.reduce((acc, value) => acc + value * value, 0));
  if (!normA || !normB) return 0;
  return dot / (normA * normB);
};

export const cosineDrift = (
  baseline: Map<string, EmbeddingRecord>,
  candidate: Map<string, EmbeddingRecord>,
): CosineDrift => {
  const entries: DriftEntry[] = [];
  const missingFromCandidate: string[] = [];
  const missingFromBaseline: string[] = [];

  for (const [id, baseRecord] of baseline.entries()) {
    const candidateRecord = candidate.get(id);
    if (!candidateRecord) {
      missingFromCandidate.push(id);
      continue;
    }
    const cosine = cosineSimilarity(baseRecord.vector, candidateRecord.vector);
    entries.push({
      itemId: id,
      baselineVersion: baseRecord.version,
      candidateVersion: candidateRecord.version,
      cosineSimilarity: cosine,
      cosineDelta: 1 - cosine,
    });
  }

  for (const id of candidate.keys()) {
    if (!baseline.has(id)) {
      missingFromBaseline.push(id);
    }
  }

  entries.sort((lhs, rhs) => lhs.itemId.localeCompare(rhs.itemId));
  missingFromBaseline.sort();
  missingFromCandidate.sort();

  if (!entries.length) {
    throw new Error('No overlapping embeddings to diff');
  }

  const averageSimilarity =
    entries.reduce((acc, entry) => acc + entry.cosineSimilarity, 0) / entries.length;

  return {
    entries,
    missingFromBaseline,
    missingFromCandidate,
    averageSimilarity,
  };
};
