export interface Relationship {
  subject: string;
  object: string;
  predicate: string;
  confidence: number;
  provenance: string;
}

export class ImplicitRelationshipExtractor {
  extract(context: string, coref: Record<string, string[]>): Relationship[] {
    const sentences = context.split(/[.!?]/).filter(Boolean);
    const relationships: Relationship[] = [];

    sentences.forEach((sentence, idx) => {
      const mentions = coref[`S${idx + 1}`] || [];
      if (mentions.length >= 2) {
        relationships.push({
          subject: mentions[0],
          object: mentions[mentions.length - 1],
          predicate: 'related_to',
          confidence: Math.min(0.95, sentence.length / 160),
          provenance: `sentence_${idx + 1}`,
        });
      }
    });

    return relationships;
  }
}
