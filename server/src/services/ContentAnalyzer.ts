/**
 * Content Analyzer
 *
 * Provides NLP-based analysis of content to detect manipulation,
 * sentiment anomalies, and disinformation signatures.
 *
 * @module ContentAnalyzer
 */

export interface AnalysisResult {
  sentiment: number; // -1.0 to 1.0
  manipulationScore: number; // 0.0 to 1.0
  keywords: string[];
  flags: string[];
}

export class ContentAnalyzer {
  /**
   * Analyzes text content for psychological influence indicators.
   */
  public analyze(content: string): AnalysisResult {
    const sentiment = this.calculateSentiment(content);
    const manipulationScore = this.detectManipulation(content);
    const keywords = this.extractKeywords(content);
    const flags = this.generateFlags(manipulationScore, keywords);

    return {
      sentiment,
      manipulationScore,
      keywords,
      flags,
    };
  }

  private calculateSentiment(text: string): number {
    const positive = [
      'trust',
      'verify',
      'safe',
      'confirmed',
      'calm',
      'solution',
    ];
    const negative = ['danger', 'crisis', 'lie', 'fake', 'enemy', 'betrayal'];

    let score = 0;
    const lower = text.toLowerCase();
    positive.forEach((w) => {
      if (lower.includes(w)) score += 0.2;
    });
    negative.forEach((w) => {
      if (lower.includes(w)) score -= 0.2;
    });

    // Normalize to -1..1 (simplified)
    return Math.max(-1, Math.min(1, score));
  }

  private detectManipulation(text: string): number {
    // Indicators of manipulative rhetoric: Urgency, Exclusion, Conspiratorial phrasing
    const indicators = [
      'act now',
      'urgent',
      'secret',
      'banned',
      'censored',
      "they don't want you to know",
      'wake up',
      'sheep',
      'viral',
      'shocking',
      'exposed',
    ];

    let hits = 0;
    const lower = text.toLowerCase();
    indicators.forEach((i) => {
      if (lower.includes(i)) hits++;
    });

    // 5 hits = 100% manipulation score
    return Math.min(1.0, hits * 0.2);
  }

  private extractKeywords(text: string): string[] {
    // Naive extraction: words > 6 chars
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 6)
      .slice(0, 5); // Top 5
  }

  private generateFlags(score: number, keywords: string[]): string[] {
    const flags: string[] = [];
    if (score >= 0.4) flags.push('POTENTIAL_MANIPULATION');
    if (score >= 0.8) flags.push('HIGH_RISK_DISINFO');
    return flags;
  }
}
