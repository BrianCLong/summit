/**
 * Text summarization and key information extraction
 */

export interface SummaryOptions {
  maxLength?: number;
  style: 'extractive' | 'abstractive';
  focusAreas?: string[];
  includeKeywords?: boolean;
}

export interface Summary {
  summary: string;
  keyPoints: string[];
  keywords?: string[];
  confidence: number;
}

export class TextSummarizer {
  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(
    content: string,
    options: SummaryOptions = { style: 'abstractive' }
  ): Promise<Summary> {
    // Placeholder implementation
    // In production, use advanced summarization algorithms or LLM APIs

    const sentences = this.extractSentences(content);
    const keywords = options.includeKeywords ? this.extractKeywords(content) : undefined;

    // Simple extractive summarization
    const importantSentences = this.rankSentences(sentences)
      .slice(0, Math.min(3, sentences.length))
      .map(s => s.text);

    const summary = importantSentences.join(' ');

    const keyPoints = this.extractKeyPoints(content);

    return {
      summary,
      keyPoints,
      keywords,
      confidence: 0.75
    };
  }

  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): Array<{ text: string; position: number }> {
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const matches = text.match(sentenceRegex) || [];

    return matches.map((text, position) => ({
      text: text.trim(),
      position
    }));
  }

  /**
   * Rank sentences by importance
   */
  private rankSentences(
    sentences: Array<{ text: string; position: number }>
  ): Array<{ text: string; score: number }> {
    return sentences.map(s => {
      let score = 0;

      // Boost sentences with important keywords
      const importantWords = [
        'critical', 'significant', 'important', 'threat',
        'vulnerability', 'risk', 'assess', 'recommend'
      ];

      for (const word of importantWords) {
        if (s.text.toLowerCase().includes(word)) {
          score += 2;
        }
      }

      // Boost sentences at the beginning
      if (s.position < 3) score += 3;

      // Boost longer sentences (more information)
      score += Math.min(s.text.length / 100, 2);

      return {
        text: s.text,
        score
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Extract key points
   */
  private extractKeyPoints(text: string, maxPoints: number = 5): string[] {
    const points: string[] = [];

    // Look for bullet points or numbered lists
    const bulletRegex = /^[\s]*[-•*]\s*(.+)$/gm;
    const matches = text.matchAll(bulletRegex);

    for (const match of matches) {
      if (points.length < maxPoints) {
        points.push(match[1].trim());
      }
    }

    // If no bullet points found, extract from sentences
    if (points.length === 0) {
      const sentences = this.extractSentences(text);
      const ranked = this.rankSentences(sentences);

      for (let i = 0; i < Math.min(maxPoints, ranked.length); i++) {
        points.push(ranked[i].text);
      }
    }

    return points;
  }

  /**
   * Extract keywords
   */
  private extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Count word frequency
    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    // Filter common words
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'have', 'been',
      'were', 'their', 'which', 'these', 'those'
    ]);

    const keywords = Array.from(frequency.entries())
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * Generate brief summary (one-liner)
   */
  generateBrief(content: string, maxLength: number = 150): string {
    const sentences = this.extractSentences(content);
    if (sentences.length === 0) return '';

    const first = sentences[0].text;
    if (first.length <= maxLength) return first;

    return first.substring(0, maxLength - 3) + '...';
  }

  /**
   * Summarize multiple documents
   */
  async summarizeMultiple(
    documents: Array<{ title: string; content: string }>,
    options: SummaryOptions = { style: 'abstractive' }
  ): Promise<Summary> {
    const allContent = documents
      .map(doc => `${doc.title}\n${doc.content}`)
      .join('\n\n');

    return this.generateExecutiveSummary(allContent, options);
  }
}
