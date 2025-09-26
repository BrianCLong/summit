export interface MediaTriageResult {
  isSyntheticLikely: boolean;
  provenanceScore: number;
  notes?: string;
}

function pseudoEntropy(buffer: Buffer): number {
  if (!buffer.length) {
    return 0;
  }

  let accumulator = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    accumulator = (accumulator + buffer[i]) % 9973;
  }

  return accumulator / 9973;
}

export async function triageAudio(buffer: Buffer): Promise<MediaTriageResult> {
  const entropy = pseudoEntropy(buffer);
  return {
    isSyntheticLikely: entropy > 0.65,
    provenanceScore: Number((1 - entropy).toFixed(2)),
    notes: 'Heuristic audio triage placeholder'
  };
}

export async function triageVideo(buffer: Buffer): Promise<MediaTriageResult> {
  const entropy = pseudoEntropy(buffer);
  return {
    isSyntheticLikely: entropy > 0.6,
    provenanceScore: Number((1 - entropy).toFixed(2)),
    notes: 'Heuristic video triage placeholder'
  };
}

export async function triageImage(buffer: Buffer): Promise<MediaTriageResult> {
  const entropy = pseudoEntropy(buffer);
  return {
    isSyntheticLikely: entropy > 0.55,
    provenanceScore: Number((1 - entropy).toFixed(2)),
    notes: 'Heuristic image triage placeholder'
  };
}
