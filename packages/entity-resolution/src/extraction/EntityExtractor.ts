/**
 * Entity extraction and Named Entity Recognition (NER)
 */

import nlp from 'compromise';
import { Entity, EntityType, ExtractionResult, EntityExtractionConfig } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export class EntityExtractor {
  private config: EntityExtractionConfig;

  constructor(config: EntityExtractionConfig = {}) {
    this.config = {
      language: 'en',
      confidenceThreshold: 0.5,
      includeContext: true,
      ...config
    };
  }

  /**
   * Extract entities from text
   */
  async extract(text: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    const doc = nlp(text);
    const entities: Entity[] = [];

    // Extract different entity types
    if (!this.config.types || this.config.types.includes(EntityType.PERSON)) {
      entities.push(...this.extractPeople(doc, text));
    }

    if (!this.config.types || this.config.types.includes(EntityType.ORGANIZATION)) {
      entities.push(...this.extractOrganizations(doc, text));
    }

    if (!this.config.types || this.config.types.includes(EntityType.LOCATION)) {
      entities.push(...this.extractLocations(doc, text));
    }

    if (!this.config.types || this.config.types.includes(EntityType.DATE)) {
      entities.push(...this.extractDates(doc, text));
    }

    if (!this.config.types || this.config.types.includes(EntityType.EMAIL)) {
      entities.push(...this.extractEmails(text));
    }

    if (!this.config.types || this.config.types.includes(EntityType.PHONE)) {
      entities.push(...this.extractPhones(text));
    }

    if (!this.config.types || this.config.types.includes(EntityType.URL)) {
      entities.push(...this.extractUrls(text));
    }

    // Apply custom patterns if provided
    if (this.config.customPatterns) {
      entities.push(...this.extractCustomPatterns(text, this.config.customPatterns));
    }

    // Filter by confidence threshold
    const filteredEntities = entities.filter(
      e => e.confidence >= (this.config.confidenceThreshold || 0)
    );

    return {
      entities: filteredEntities,
      text,
      language: this.config.language,
      metadata: {
        extractionTime: Date.now() - startTime,
        entityCount: filteredEntities.length,
        model: 'compromise-ner'
      }
    };
  }

  /**
   * Extract person entities
   */
  private extractPeople(doc: any, text: string): Entity[] {
    const people = doc.people();
    const entities: Entity[] = [];

    people.forEach((person: any) => {
      const personText = person.text();
      const position = this.findPosition(text, personText);

      entities.push({
        id: uuidv4(),
        type: EntityType.PERSON,
        text: personText,
        attributes: {
          firstName: person.firstName()?.text() || '',
          lastName: person.lastName()?.text() || '',
          honorific: person.honorifics()?.text() || ''
        },
        confidence: 0.85,
        position,
        context: this.config.includeContext ? this.getContext(text, position) : undefined,
        metadata: {
          extractedAt: new Date(),
          model: 'compromise'
        }
      });
    });

    return entities;
  }

  /**
   * Extract organization entities
   */
  private extractOrganizations(doc: any, text: string): Entity[] {
    const orgs = doc.organizations();
    const entities: Entity[] = [];

    orgs.forEach((org: any) => {
      const orgText = org.text();
      const position = this.findPosition(text, orgText);

      entities.push({
        id: uuidv4(),
        type: EntityType.ORGANIZATION,
        text: orgText,
        attributes: {
          name: orgText,
          abbreviation: this.extractAbbreviation(orgText)
        },
        confidence: 0.80,
        position,
        context: this.config.includeContext ? this.getContext(text, position) : undefined,
        metadata: {
          extractedAt: new Date(),
          model: 'compromise'
        }
      });
    });

    return entities;
  }

  /**
   * Extract location entities
   */
  private extractLocations(doc: any, text: string): Entity[] {
    const places = doc.places();
    const entities: Entity[] = [];

    places.forEach((place: any) => {
      const placeText = place.text();
      const position = this.findPosition(text, placeText);

      entities.push({
        id: uuidv4(),
        type: EntityType.LOCATION,
        text: placeText,
        attributes: {
          name: placeText,
          locationType: this.classifyLocation(placeText)
        },
        confidence: 0.75,
        position,
        context: this.config.includeContext ? this.getContext(text, position) : undefined,
        metadata: {
          extractedAt: new Date(),
          model: 'compromise'
        }
      });
    });

    return entities;
  }

  /**
   * Extract date entities
   */
  private extractDates(doc: any, text: string): Entity[] {
    const dates = doc.dates();
    const entities: Entity[] = [];

    dates.forEach((date: any) => {
      const dateText = date.text();
      const position = this.findPosition(text, dateText);

      entities.push({
        id: uuidv4(),
        type: EntityType.DATE,
        text: dateText,
        attributes: {
          normalized: date.json()?.[0]?.dates || dateText
        },
        confidence: 0.90,
        position,
        context: this.config.includeContext ? this.getContext(text, position) : undefined,
        metadata: {
          extractedAt: new Date(),
          model: 'compromise'
        }
      });
    });

    return entities;
  }

  /**
   * Extract email addresses
   */
  private extractEmails(text: string): Entity[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.matchAll(emailRegex);
    const entities: Entity[] = [];

    for (const match of matches) {
      const email = match[0];
      const position = { start: match.index!, end: match.index! + email.length };

      entities.push({
        id: uuidv4(),
        type: EntityType.EMAIL,
        text: email,
        attributes: {
          domain: email.split('@')[1],
          username: email.split('@')[0]
        },
        confidence: 0.95,
        position,
        context: this.config.includeContext ? this.getContext(text, position) : undefined,
        metadata: {
          extractedAt: new Date(),
          model: 'regex'
        }
      });
    }

    return entities;
  }

  /**
   * Extract phone numbers
   */
  private extractPhones(text: string): Entity[] {
    const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const matches = text.matchAll(phoneRegex);
    const entities: Entity[] = [];

    for (const match of matches) {
      const phone = match[0];
      const position = { start: match.index!, end: match.index! + phone.length };

      entities.push({
        id: uuidv4(),
        type: EntityType.PHONE,
        text: phone,
        attributes: {
          normalized: `+1${match[1]}${match[2]}${match[3]}`
        },
        confidence: 0.90,
        position,
        context: this.config.includeContext ? this.getContext(text, position) : undefined,
        metadata: {
          extractedAt: new Date(),
          model: 'regex'
        }
      });
    }

    return entities;
  }

  /**
   * Extract URLs
   */
  private extractUrls(text: string): Entity[] {
    const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/g;
    const matches = text.matchAll(urlRegex);
    const entities: Entity[] = [];

    for (const match of matches) {
      const url = match[0];
      const position = { start: match.index!, end: match.index! + url.length };

      try {
        const urlObj = new URL(url);

        entities.push({
          id: uuidv4(),
          type: EntityType.URL,
          text: url,
          attributes: {
            domain: urlObj.hostname,
            protocol: urlObj.protocol,
            path: urlObj.pathname
          },
          confidence: 0.95,
          position,
          context: this.config.includeContext ? this.getContext(text, position) : undefined,
          metadata: {
            extractedAt: new Date(),
            model: 'regex'
          }
        });
      } catch {
        // Invalid URL, skip
      }
    }

    return entities;
  }

  /**
   * Extract entities using custom patterns
   */
  private extractCustomPatterns(text: string, patterns: RegExp[]): Entity[] {
    const entities: Entity[] = [];

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        const matchText = match[0];
        const position = { start: match.index!, end: match.index! + matchText.length };

        entities.push({
          id: uuidv4(),
          type: EntityType.CUSTOM,
          text: matchText,
          attributes: {},
          confidence: 0.70,
          position,
          context: this.config.includeContext ? this.getContext(text, position) : undefined,
          metadata: {
            extractedAt: new Date(),
            model: 'custom-pattern'
          }
        });
      }
    });

    return entities;
  }

  /**
   * Find position of text in string
   */
  private findPosition(text: string, searchText: string): { start: number; end: number } {
    const start = text.indexOf(searchText);
    return {
      start,
      end: start + searchText.length
    };
  }

  /**
   * Get context around a position
   */
  private getContext(text: string, position: { start: number; end: number }, contextSize: number = 50): string {
    const start = Math.max(0, position.start - contextSize);
    const end = Math.min(text.length, position.end + contextSize);
    return text.substring(start, end);
  }

  /**
   * Extract abbreviation from organization name
   */
  private extractAbbreviation(text: string): string | undefined {
    const words = text.split(/\s+/);
    if (words.length >= 2) {
      return words.map(w => w[0]?.toUpperCase()).join('');
    }
    return undefined;
  }

  /**
   * Classify location type
   */
  private classifyLocation(text: string): string {
    const cityIndicators = ['city', 'town', 'village'];
    const countryIndicators = ['country', 'nation', 'republic'];
    const stateIndicators = ['state', 'province', 'territory'];

    const lower = text.toLowerCase();

    if (cityIndicators.some(i => lower.includes(i))) return 'city';
    if (countryIndicators.some(i => lower.includes(i))) return 'country';
    if (stateIndicators.some(i => lower.includes(i))) return 'state';

    return 'unknown';
  }
}
