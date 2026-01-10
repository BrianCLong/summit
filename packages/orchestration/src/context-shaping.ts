export interface EvidenceItem {
  id: string;
  text: string;
  source?: string;
  confidence?: number;
}

export interface ShapedContext {
  contextText: string;
  provenance: string[];
  conflicts: { ids: string[]; note: string }[];
}

function dedupeEvidence(evidence: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  });
}

function detectConflicts(evidence: EvidenceItem[]): { ids: string[]; note: string }[] {
  const conflicts: { ids: string[]; note: string }[] = [];
  for (let i = 0; i < evidence.length; i += 1) {
    for (let j = i + 1; j < evidence.length; j += 1) {
      const left = evidence[i];
      const right = evidence[j];
      if (left.text.trim() === '' || right.text.trim() === '') continue;
      if (left.text.toLowerCase() === right.text.toLowerCase()) continue;
      if (left.text.toLowerCase().includes('conflict') || right.text.toLowerCase().includes('conflict')) {
        conflicts.push({ ids: [left.id, right.id], note: 'Potential contradictory evidence' });
      }
    }
  }
  return conflicts;
}

function rankEvidence(evidence: EvidenceItem[]): EvidenceItem[] {
  return [...evidence].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

export function shapeContext({
  query,
  evidence,
  budgetTokens,
}: {
  query: string;
  evidence: EvidenceItem[];
  budgetTokens: number;
}): ShapedContext {
  const deduped = dedupeEvidence(evidence);
  const ranked = rankEvidence(deduped);
  const conflicts = detectConflicts(ranked);

  const clipped: EvidenceItem[] = [];
  let remaining = budgetTokens;
  for (const item of ranked) {
    const tokenEstimate = Math.ceil(item.text.length / 4);
    if (tokenEstimate > remaining) continue;
    remaining -= tokenEstimate;
    clipped.push(item);
  }

  const contextText = [`Query: ${query}`, 'Evidence:', ...clipped.map((item) => `- (${item.id}) ${item.text}`)].join('\n');

  return {
    contextText,
    provenance: clipped.map((item) => item.id),
    conflicts,
  };
}
