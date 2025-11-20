import { NamedEntityRecognizer } from './ner.js';
import type { ExtractedEntity, ExtractionResult, ExtractionConfig } from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Entity Extractor
 * High-level API for entity extraction
 */
export class EntityExtractor {
  private ner: NamedEntityRecognizer;
  private config: ExtractionConfig;

  constructor(config: ExtractionConfig = {}) {
    this.ner = new NamedEntityRecognizer();
    this.config = {
      extractPersons: true,
      extractOrganizations: true,
      extractLocations: true,
      extractDates: true,
      extractMoney: true,
      extractContacts: true,
      extractIndicators: true,
      minConfidence: 0.5,
      inferRelationships: false,
      deduplicateEntities: true,
      ...config
    };
  }

  /**
   * Extract entities from text
   */
  async extract(text: string): Promise<ExtractionResult> {
    // Extract entities using NER
    let entities = this.ner.extractEntities(text, {
      extractPersons: this.config.extractPersons,
      extractOrgs: this.config.extractOrganizations,
      extractLocations: this.config.extractLocations,
      extractDates: this.config.extractDates,
      extractMoney: this.config.extractMoney,
      extractContacts: this.config.extractContacts,
      extractIndicators: this.config.extractIndicators,
      minConfidence: this.config.minConfidence
    });

    // Deduplicate entities if enabled
    if (this.config.deduplicateEntities) {
      entities = this.deduplicateEntities(entities);
    }

    // Assign IDs to entities
    entities = entities.map(e => ({
      ...e,
      id: e.id || uuidv4()
    }));

    return {
      entities,
      relationships: [], // Relationships are inferred separately
      text,
      metadata: {
        entityCount: entities.length,
        extractedAt: new Date()
      }
    };
  }

  /**
   * Deduplicate entities based on text and span overlap
   */
  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const deduplicated: ExtractedEntity[] = [];
    const seen = new Set<string>();

    for (const entity of entities) {
      const key = `${entity.kind}:${entity.normalizedText || entity.text}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(entity);
      }
    }

    return deduplicated;
  }
}
