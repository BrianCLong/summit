/**
 * Named Entity Recognition (NER)
 */

import type { Entity, EntityType, NEROptions } from '../types';

export class NERExtractor {
  private options: Required<NEROptions>;
  private customPatterns: Map<string, RegExp> = new Map();

  constructor(options: NEROptions = {}) {
    this.options = {
      language: options.language ?? 'en',
      customTypes: options.customTypes ?? [],
      minConfidence: options.minConfidence ?? 0.5,
      includeNested: options.includeNested ?? false,
      includeDates: options.includeDates ?? true,
      resolveEntities: options.resolveEntities ?? false,
      linkToKnowledgeBase: options.linkToKnowledgeBase ?? false,
    };

    this.initializePatterns();
  }

  /**
   * Extract named entities from text
   */
  extract(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract different entity types
    entities.push(...this.extractPersons(text));
    entities.push(...this.extractOrganizations(text));
    entities.push(...this.extractLocations(text));

    if (this.options.includeDates) {
      entities.push(...this.extractDates(text));
      entities.push(...this.extractTimes(text));
    }

    entities.push(...this.extractMoney(text));
    entities.push(...this.extractPercentages(text));
    entities.push(...this.extractCustomEntities(text));

    // Filter by confidence threshold
    const filtered = entities.filter((e) => e.confidence >= this.options.minConfidence);

    // Sort by position
    filtered.sort((a, b) => a.start - b.start);

    // Remove overlapping entities if not including nested
    if (!this.options.includeNested) {
      return this.removeOverlapping(filtered);
    }

    return filtered;
  }

  /**
   * Extract entities by type
   */
  extractByType(text: string, type: EntityType): Entity[] {
    const allEntities = this.extract(text);
    return allEntities.filter((e) => e.type === type);
  }

  /**
   * Extract person names
   */
  private extractPersons(text: string): Entity[] {
    const entities: Entity[] = [];

    // Simplified person name extraction
    // In production, use a proper NER model or library
    const titlePattern = /\b(Mr|Mrs|Ms|Dr|Prof|Sir|Lord|Lady|Captain|Colonel)\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let match;

    while ((match = titlePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'PERSON',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.9,
        metadata: { title: match[1] },
      });
    }

    // Simple capitalized word patterns
    const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;

    while ((match = namePattern.exec(text)) !== null) {
      // Check if not already captured
      const overlaps = entities.some(
        (e) => match.index >= e.start && match.index < e.end
      );

      if (!overlaps) {
        entities.push({
          text: match[0],
          type: 'PERSON',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.7,
        });
      }
    }

    return entities;
  }

  /**
   * Extract organization names
   */
  private extractOrganizations(text: string): Entity[] {
    const entities: Entity[] = [];

    // Organization patterns
    const patterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Inc|Corp|LLC|Ltd|Company|Corporation|Incorporated)\b/g,
      /\b([A-Z][A-Z]+)\b/g, // Acronyms
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'ORGANIZATION',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8,
        });
      }
    }

    return entities;
  }

  /**
   * Extract location names
   */
  private extractLocations(text: string): Entity[] {
    const entities: Entity[] = [];

    // Common location patterns
    const cityStatePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})\b/g;
    let match;

    while ((match = cityStatePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'LOCATION',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.9,
        metadata: { city: match[1], state: match[2] },
      });
    }

    // Countries and cities (simplified)
    const locationPattern = /\b(United States|United Kingdom|China|Russia|Japan|Germany|France|New York|London|Paris|Tokyo|Beijing|Moscow)\b/g;

    while ((match = locationPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'LOCATION',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    return entities;
  }

  /**
   * Extract dates
   */
  private extractDates(text: string): Entity[] {
    const entities: Entity[] = [];

    // Various date patterns
    const patterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // MM/DD/YYYY
      /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'DATE',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.95,
        });
      }
    }

    return entities;
  }

  /**
   * Extract times
   */
  private extractTimes(text: string): Entity[] {
    const entities: Entity[] = [];

    const timePattern = /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g;
    let match;

    while ((match = timePattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'TIME',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    return entities;
  }

  /**
   * Extract money amounts
   */
  private extractMoney(text: string): Entity[] {
    const entities: Entity[] = [];

    const moneyPattern = /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY)/gi;
    let match;

    while ((match = moneyPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'MONEY',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.95,
      });
    }

    return entities;
  }

  /**
   * Extract percentages
   */
  private extractPercentages(text: string): Entity[] {
    const entities: Entity[] = [];

    const percentPattern = /\b\d+(?:\.\d+)?%/g;
    let match;

    while ((match = percentPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'PERCENT',
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.98,
      });
    }

    return entities;
  }

  /**
   * Extract custom entity types
   */
  private extractCustomEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    for (const [type, pattern] of this.customPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'CUSTOM',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8,
          metadata: { customType: type },
        });
      }
    }

    return entities;
  }

  /**
   * Add custom entity pattern
   */
  addCustomPattern(type: string, pattern: RegExp): void {
    this.customPatterns.set(type, pattern);
  }

  /**
   * Remove overlapping entities
   */
  private removeOverlapping(entities: Entity[]): Entity[] {
    if (entities.length === 0) return [];

    const result: Entity[] = [entities[0]];

    for (let i = 1; i < entities.length; i++) {
      const current = entities[i];
      const last = result[result.length - 1];

      // Check if overlapping
      if (current.start >= last.end) {
        result.push(current);
      } else if (current.confidence > last.confidence) {
        // Replace with higher confidence entity
        result[result.length - 1] = current;
      }
    }

    return result;
  }

  /**
   * Initialize built-in patterns
   */
  private initializePatterns(): void {
    // Weapon patterns
    this.addCustomPattern(
      'WEAPON',
      /\b(AK-47|M16|pistol|rifle|handgun|firearm|explosive|bomb|missile|grenade)\b/gi
    );

    // Vehicle patterns
    this.addCustomPattern(
      'VEHICLE',
      /\b(Toyota|Honda|Ford|Chevrolet|BMW|Mercedes|aircraft|helicopter|ship|submarine)\b/gi
    );

    // Facility patterns
    this.addCustomPattern(
      'FACILITY',
      /\b(airport|hospital|school|university|prison|facility|base|compound)\b/gi
    );
  }
}

export * from './multilingual';
export * from './confidence';
