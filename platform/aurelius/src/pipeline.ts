import { Idea, IPConcept, PriorArtReference } from './types.js';
import { randomUUID } from 'crypto';

export class IdeaExtractionPipeline {
  extractConcepts(text: string): IPConcept[] {
    // Deterministic mock
    const keywords = text.split(' ').filter(w => w.length > 5);
    return keywords.map(k => ({
      id: randomUUID(),
      keyword: k,
      category: 'GENERATED'
    }));
  }

  calculateNovelty(text: string, priorArt: PriorArtReference[]): number {
    // Mock similarity: if text contains "blockchain", low novelty
    if (text.toLowerCase().includes('blockchain')) return 0.2;
    return 0.85; // High default
  }

  draftPackage(title: string, abstract: string): Idea {
    const concepts = this.extractConcepts(abstract);
    const score = this.calculateNovelty(abstract, []);

    return {
      id: randomUUID(),
      title,
      abstract,
      concepts,
      noveltyScore: score,
      claims: [
        `A method for ${title} comprising step A.`,
        `The method of claim 1 wherein step A includes ${concepts[0]?.keyword || 'processing'}.`,
        `A system configured to perform the method of claim 1.`
      ]
    };
  }
}
