/**
 * Information extraction
 */

import type { KeyPhrase } from '../types';

export class InformationExtractor {
  /**
   * Extract keyphrases
   */
  extractKeyphrases(text: string, topK: number = 10): KeyPhrase[] {
    const phrases: KeyPhrase[] = [];

    // Extract noun phrases (simplified)
    const nounPhrases = this.extractNounPhrases(text);

    // Calculate scores based on frequency and position
    const scored = nounPhrases.map((phrase, idx) => ({
      text: phrase.text,
      score: phrase.frequency * (1 - idx * 0.01),
      start: phrase.start,
      end: phrase.end,
      frequency: phrase.frequency,
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  /**
   * Extract quotes and attributions
   */
  extractQuotes(text: string): Array<{
    quote: string;
    speaker?: string;
    position: { start: number; end: number };
  }> {
    const quotes: Array<{
      quote: string;
      speaker?: string;
      position: { start: number; end: number };
    }> = [];

    const quotePattern = /"([^"]+)"/g;
    let match;

    while ((match = quotePattern.exec(text)) !== null) {
      const speaker = this.findSpeaker(text, match.index);
      quotes.push({
        quote: match[1],
        speaker,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    return quotes;
  }

  /**
   * Extract citations
   */
  extractCitations(text: string): Array<{
    citation: string;
    type: 'footnote' | 'inline' | 'bibliography';
    position: { start: number; end: number };
  }> {
    const citations: Array<{
      citation: string;
      type: 'footnote' | 'inline' | 'bibliography';
      position: { start: number; end: number };
    }> = [];

    // Extract common citation formats
    const patterns = [
      /\[(\d+)\]/g, // [1]
      /\(([^)]+,\s*\d{4})\)/g, // (Author, 2020)
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        citations.push({
          citation: match[1],
          type: 'inline',
          position: {
            start: match.index,
            end: match.index + match[0].length,
          },
        });
      }
    }

    return citations;
  }

  /**
   * Extract tables and lists
   */
  extractStructures(text: string): {
    tables: string[];
    lists: string[];
  } {
    return {
      tables: [],
      lists: [],
    };
  }

  /**
   * Extract noun phrases
   */
  private extractNounPhrases(text: string): Array<{
    text: string;
    start: number;
    end: number;
    frequency: number;
  }> {
    const phrases: Map<string, { start: number; end: number; count: number }> = new Map();

    // Simplified noun phrase extraction
    const pattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[0];
      const existing = phrases.get(phrase);

      if (existing) {
        existing.count++;
      } else {
        phrases.set(phrase, {
          start: match.index,
          end: match.index + phrase.length,
          count: 1,
        });
      }
    }

    return Array.from(phrases.entries()).map(([text, data]) => ({
      text,
      start: data.start,
      end: data.end,
      frequency: data.count,
    }));
  }

  /**
   * Find speaker for quote
   */
  private findSpeaker(text: string, quotePosition: number): string | undefined {
    // Look for name before quote
    const before = text.substring(Math.max(0, quotePosition - 50), quotePosition);
    const nameMatch = before.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s+said$/);

    return nameMatch ? nameMatch[1] : undefined;
  }
}

export * from './resume-parser';
export * from './form-extraction';
