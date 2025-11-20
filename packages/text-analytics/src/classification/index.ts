/**
 * Text classification
 */

import type { ClassificationResult } from '../types';

export class TextClassifier {
  private model: Map<string, string[]> = new Map();

  /**
   * Multi-class classification
   */
  classify(text: string, labels: string[]): ClassificationResult {
    const scores = labels.map((label) => ({
      label,
      confidence: this.calculateScore(text, label),
    }));

    scores.sort((a, b) => b.confidence - a.confidence);

    return {
      label: scores[0].label,
      confidence: scores[0].confidence,
      allLabels: scores,
    };
  }

  /**
   * Multi-label classification
   */
  classifyMultiLabel(text: string, labels: string[], threshold: number = 0.5): string[] {
    const result = this.classify(text, labels);
    return result.allLabels!.filter((l) => l.confidence >= threshold).map((l) => l.label);
  }

  /**
   * Intent classification
   */
  classifyIntent(text: string): ClassificationResult {
    const intents = ['question', 'statement', 'command', 'exclamation'];
    return this.classify(text, intents);
  }

  /**
   * Zero-shot classification
   */
  zeroShot(text: string, candidateLabels: string[]): ClassificationResult {
    // Simplified zero-shot classification
    return this.classify(text, candidateLabels);
  }

  /**
   * Train classifier
   */
  train(examples: Array<{ text: string; label: string }>): void {
    for (const example of examples) {
      const words = example.text.toLowerCase().match(/\b\w+\b/g) || [];
      const existing = this.model.get(example.label) || [];
      this.model.set(example.label, [...existing, ...words]);
    }
  }

  /**
   * Calculate classification score
   */
  private calculateScore(text: string, label: string): number {
    const words = new Set(text.toLowerCase().match(/\b\w+\b/g) || []);
    const labelWords = this.model.get(label) || [];

    if (labelWords.length === 0) return Math.random() * 0.5;

    const matches = labelWords.filter((w) => words.has(w)).length;
    return Math.min(matches / labelWords.length, 1.0);
  }
}

export * from './spam-detection';
export * from './toxicity';
