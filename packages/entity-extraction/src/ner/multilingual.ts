/**
 * Multi-language NER support
 */

import type { Entity, EntityType } from '../types';
import { NERExtractor } from './index';

export class MultilingualNER {
  private extractors: Map<string, NERExtractor> = new Map();

  /**
   * Extract entities from text in multiple languages
   */
  extract(text: string, language: string): Entity[] {
    let extractor = this.extractors.get(language);

    if (!extractor) {
      extractor = new NERExtractor({ language });
      this.extractors.set(language, extractor);
    }

    return extractor.extract(text);
  }

  /**
   * Extract entities with automatic language detection
   */
  async extractAuto(text: string): Promise<Entity[]> {
    const language = await this.detectLanguage(text);
    return this.extract(text, language);
  }

  /**
   * Detect language (simplified)
   */
  private async detectLanguage(text: string): Promise<string> {
    // Simplified language detection
    // In production, use @intelgraph/nlp language detection
    return 'en';
  }
}
