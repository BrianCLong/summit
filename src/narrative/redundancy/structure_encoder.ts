import { createHash } from 'crypto';

export interface StructuralGraph {
  nodes: { type: string; count: number }[];
  edges: { relation: string; count: number }[];
  fingerprint: string;
}

export function encodeStructure(docText: string): StructuralGraph {
  // MWS: Simple regex-based structure detection
  // Detects "X because Y", "X implies Y", "Actor does Action" patterns via simplified regex

  const becauseCount = (docText.match(/because/g) || []).length;
  const impliesCount = (docText.match(/implies/g) || []).length;
  const verbCount = (docText.match(/(is|are|was|were|has|have|does|do)/g) || []).length;

  const structureString = `B:${becauseCount}-I:${impliesCount}-V:${verbCount}`;

  const fingerprint = createHash('sha256').update(structureString).digest('hex');

  return {
    nodes: [
      { type: 'verb_phrase', count: verbCount }
    ],
    edges: [
      { relation: 'causal', count: becauseCount + impliesCount }
    ],
    fingerprint
  };
}
