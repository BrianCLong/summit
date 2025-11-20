/**
 * Spell correction for search queries
 * Handles typos and suggests corrections
 */

import type { SpellCorrection } from '../types.js';
import * as natural from 'natural';
import leven from 'leven';

export class SpellCorrector {
  private dictionary: Set<string>;
  private bigramFrequency: Map<string, number>;
  private tokenizer: natural.WordTokenizer;

  constructor() {
    this.dictionary = new Set();
    this.bigramFrequency = new Map();
    this.tokenizer = new natural.WordTokenizer();
    this.initializeDictionary();
  }

  /**
   * Initialize with common English words and domain-specific terms
   */
  private initializeDictionary(): void {
    // Common words
    const commonWords = [
      'the',
      'be',
      'to',
      'of',
      'and',
      'a',
      'in',
      'that',
      'have',
      'it',
      'for',
      'not',
      'on',
      'with',
      'he',
      'as',
      'you',
      'do',
      'at',
      'this',
      'but',
      'his',
      'by',
      'from',
      'they',
      'we',
      'say',
      'her',
      'she',
      'or',
      'an',
      'will',
      'my',
      'one',
      'all',
      'would',
      'there',
      'their',
    ];

    // Intelligence/security domain terms
    const domainWords = [
      'threat',
      'intelligence',
      'malware',
      'vulnerability',
      'attack',
      'exploit',
      'phishing',
      'ransomware',
      'backdoor',
      'trojan',
      'botnet',
      'campaign',
      'actor',
      'infrastructure',
      'indicator',
      'compromise',
      'breach',
      'exfiltration',
      'lateral',
      'persistence',
      'reconnaissance',
      'weaponization',
      'delivery',
      'installation',
      'command',
      'control',
      'actions',
      'objectives',
    ];

    for (const word of [...commonWords, ...domainWords]) {
      this.dictionary.add(word.toLowerCase());
    }
  }

  /**
   * Add words to dictionary
   */
  addToDictionary(words: string[]): void {
    for (const word of words) {
      this.dictionary.add(word.toLowerCase());
    }
  }

  /**
   * Check and correct spelling in query
   */
  async correct(query: string): Promise<SpellCorrection> {
    const tokens = this.tokenizer.tokenize(query) || [];
    const corrections: SpellCorrection['corrections'] = [];
    let hasErrors = false;
    const correctedTokens: string[] = [];

    for (const token of tokens) {
      const lowerToken = token.toLowerCase();

      if (this.dictionary.has(lowerToken) || this.isNumeric(token)) {
        // Word is correct
        correctedTokens.push(token);
      } else {
        // Word might be misspelled
        const suggestions = this.getSuggestions(lowerToken);

        if (suggestions.length > 0) {
          hasErrors = true;
          corrections.push({
            word: token,
            suggestions: suggestions.slice(0, 5),
            confidence: this.calculateConfidence(lowerToken, suggestions[0]),
          });

          // Use best suggestion
          correctedTokens.push(suggestions[0]);
        } else {
          // No suggestions, keep original
          correctedTokens.push(token);
        }
      }
    }

    return {
      original: query,
      corrected: correctedTokens.join(' '),
      corrections,
      hasErrors,
    };
  }

  /**
   * Get spelling suggestions for a word
   */
  private getSuggestions(word: string): string[] {
    const candidates: Array<{ word: string; distance: number }> = [];
    const maxDistance = word.length <= 4 ? 1 : 2;

    for (const dictWord of this.dictionary) {
      const distance = leven(word, dictWord);

      if (distance <= maxDistance) {
        candidates.push({ word: dictWord, distance });
      }
    }

    // Sort by edit distance
    candidates.sort((a, b) => a.distance - b.distance);

    return candidates.map((c) => c.word);
  }

  /**
   * Calculate confidence in correction
   */
  private calculateConfidence(original: string, suggestion: string): number {
    const distance = leven(original, suggestion);
    const maxLength = Math.max(original.length, suggestion.length);

    // Confidence inversely proportional to edit distance
    return Math.max(0, 1 - distance / maxLength);
  }

  /**
   * Check if token is numeric
   */
  private isNumeric(token: string): boolean {
    return /^\d+$/.test(token);
  }

  /**
   * Train spell corrector with corpus
   */
  async trainFromCorpus(corpus: string[]): Promise<void> {
    for (const text of corpus) {
      const tokens = this.tokenizer.tokenize(text.toLowerCase()) || [];

      // Add tokens to dictionary
      for (const token of tokens) {
        if (token.length > 2) {
          this.dictionary.add(token);
        }
      }

      // Build bigram frequency
      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        this.bigramFrequency.set(bigram, (this.bigramFrequency.get(bigram) || 0) + 1);
      }
    }

    console.log(`Dictionary size: ${this.dictionary.size}`);
  }

  /**
   * Get dictionary size
   */
  getDictionarySize(): number {
    return this.dictionary.size;
  }
}

/**
 * Context-aware spell correction using language models
 */
export class ContextualSpellCorrector {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Correct spelling using LLM context
   */
  async correct(query: string): Promise<SpellCorrection> {
    if (!this.apiKey) {
      throw new Error('API key required for contextual spell correction');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are a spell checker. Correct any spelling errors in the query. Return only the corrected query, nothing else.',
            },
            {
              role: 'user',
              content: query,
            },
          ],
          temperature: 0,
          max_tokens: 100,
        }),
      });

      const data = await response.json();
      const corrected = data.choices[0]?.message?.content?.trim() || query;

      return {
        original: query,
        corrected,
        corrections: [],
        hasErrors: corrected !== query,
      };
    } catch (error) {
      console.error('Contextual spell correction failed:', error);
      return {
        original: query,
        corrected: query,
        corrections: [],
        hasErrors: false,
      };
    }
  }
}
