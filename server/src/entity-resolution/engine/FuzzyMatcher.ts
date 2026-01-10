import natural from 'natural';
import { StringNormalizer } from '../utils/StringNormalizer.js';

export class FuzzyMatcher {
  /**
   * Calculates Levenshtein distance similarity (0 to 1).
   * 1 means identical, 0 means completely different.
   */
  public static levenshteinSimilarity(s1: string, s2: string): number {
    const norm1 = StringNormalizer.normalize(s1);
    const norm2 = StringNormalizer.normalize(s2);

    if (norm1 === norm2) return 1.0;
    if (norm1.length === 0 || norm2.length === 0) return 0.0;

    const distance = natural.LevenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);

    return 1.0 - (distance / maxLength);
  }

  /**
   * Calculates Jaro-Winkler similarity (0 to 1).
   */
  public static jaroWinklerSimilarity(s1: string, s2: string): number {
    const norm1 = StringNormalizer.normalize(s1);
    const norm2 = StringNormalizer.normalize(s2);

    if (norm1 === norm2) return 1.0;
    if (norm1.length === 0 || norm2.length === 0) return 0.0;

    // @ts-ignore - natural types might be strict about options
    return natural.JaroWinklerDistance(norm1, norm2, undefined);
  }

  /**
   * Calculates Cosine similarity based on token frequency.
   */
  public static cosineSimilarity(s1: string, s2: string): number {
    const norm1 = StringNormalizer.normalize(s1);
    const norm2 = StringNormalizer.normalize(s2);

    if (norm1 === norm2) return 1.0;
    if (norm1.length === 0 || norm2.length === 0) return 0.0;

    const tokens1 = this.tokenize(norm1);
    const tokens2 = this.tokenize(norm2);

    const vector1 = this.getFrequencyVector(tokens1);
    const vector2 = this.getFrequencyVector(tokens2);

    const allTokens = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const token of allTokens) {
      const v1 = vector1[token] || 0;
      const v2 = vector2[token] || 0;
      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    }

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * Calculates Token Jaccard Similarity.
   * Intersection over Union of tokens.
   */
  public static tokenJaccardSimilarity(s1: string, s2: string): number {
    const norm1 = StringNormalizer.normalize(s1);
    const norm2 = StringNormalizer.normalize(s2);

    const tokens1 = new Set(this.tokenize(norm1));
    const tokens2 = new Set(this.tokenize(norm2));

    if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
    if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  private static tokenize(text: string): string[] {
    return text.split(/\s+/);
  }

  private static getFrequencyVector(tokens: string[]): Record<string, number> {
    const vector: Record<string, number> = {};
    for (const token of tokens) {
      vector[token] = (vector[token] || 0) + 1;
    }
    return vector;
  }
}
