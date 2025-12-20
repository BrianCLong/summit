/**
 * Toxicity and hate speech detection
 */

export class ToxicityDetector {
  detect(text: string): { isToxic: boolean; severity: number; categories: string[] } {
    const toxicWords = ['hate', 'kill', 'stupid', 'idiot'];
    const lower = text.toLowerCase();

    let toxicityScore = 0;
    const categories: string[] = [];

    for (const word of toxicWords) {
      if (lower.includes(word)) {
        toxicityScore += 0.25;
        categories.push('offensive');
      }
    }

    return {
      isToxic: toxicityScore > 0.5,
      severity: Math.min(toxicityScore, 1.0),
      categories,
    };
  }
}
