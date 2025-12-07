import { Entity, EntityType } from '../types.js';

export enum MatchingMethod {
  EXACT = 'EXACT',
  FUZZY = 'FUZZY',
  ML = 'ML'
}

export interface EntityMatcherOptions {
  threshold?: number;
  methods?: MatchingMethod[];
}

export interface MatchResult {
  entity1: Entity;
  entity2: Entity;
  score: number;
  method: MatchingMethod;
  reasons: string[];
}

export class EntityMatcher {
  private options: EntityMatcherOptions;

  constructor(options: EntityMatcherOptions = {}) {
    this.options = options;
  }

  // Unused EntityType warning ignored as it might be used later, or remove import if strictly cleaning up
   
  async matchPair(entity1: Entity, entity2: Entity): Promise<MatchResult | null> {
    if (entity1.type !== entity2.type) {return Promise.resolve(null);}

    const text1 = entity1.text.toLowerCase();
    const text2 = entity2.text.toLowerCase();

    if (text1 === text2) {
      return Promise.resolve({
        entity1,
        entity2,
        score: 1.0,
        method: MatchingMethod.EXACT,
        reasons: ['Exact text match']
      });
    }

    // Simple fuzzy stub
    if (text1.includes(text2) || text2.includes(text1)) {
       return Promise.resolve({
        entity1,
        entity2,
        score: 0.8,
        method: MatchingMethod.FUZZY,
        reasons: ['Substring match']
      });
    }
    
    // Levenshtein-like stub for "John" vs "Jon"
    if (this.isSimilar(text1, text2)) {
        return Promise.resolve({
            entity1,
            entity2,
            score: 0.75,
            method: MatchingMethod.FUZZY,
            reasons: ['Similarity threshold met']
        });
    }

    return Promise.resolve(null);
  }

  async findMatches(target: Entity, candidates: Entity[]): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];
    for (const candidate of candidates) {
      const match = await this.matchPair(target, candidate);
      if (match) {matches.push(match);}
    }
    return matches.sort((a, b) => b.score - a.score);
  }
  
  private isSimilar(a: string, b: string): boolean {
      // Stub: return true if they share > 50% of chars or short edit distance
      if (Math.abs(a.length - b.length) > 2) {return false;}
      let diff = 0;
      let i = 0, j = 0;
      while(i < a.length && j < b.length) {
          if (a[i] !== b[j]) {
              diff++;
              if (a.length > b.length) {i++;}
              else if (b.length > a.length) {j++;}
              else { i++; j++; }
          } else {
              i++; j++;
          }
      }
      return diff <= 2;
  }
}