import { Entity, EntityType, ExtractionResult } from '../types.js';

export interface EntityExtractorOptions {
  confidenceThreshold?: number;
  includeContext?: boolean;
}

export class EntityExtractor {
  private options: EntityExtractorOptions;

  constructor(options: EntityExtractorOptions = {}) {
    this.options = options;
  }

  async extract(text: string): Promise<ExtractionResult> {
    const start = Date.now();
    const entities: Entity[] = [];

    // Simple regex-based extraction for stubbing
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        type: EntityType.EMAIL,
        text: match[0],
        attributes: {},
        confidence: 1.0,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    const phoneRegex = /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        type: EntityType.PHONE,
        text: match[0],
        attributes: {},
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    const urlRegex = /https?:\/\/[^\s]+/g;
    while ((match = urlRegex.exec(text)) !== null) {
      try {
        const url = new URL(match[0]);
        entities.push({
          type: EntityType.URL,
          text: match[0],
          attributes: { domain: url.hostname },
          confidence: 0.95,
          start: match.index,
          end: match.index + match[0].length
        });
      } catch (_error) {
        // ignore invalid URLs
      }
    }

    // Avoid require-await warning by resolving promise
    return Promise.resolve({
      text,
      entities,
      metadata: {
        model: 'stub-regex',
        extractionTime: Date.now() - start
      }
    });
  }
}