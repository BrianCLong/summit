/**
 * Relationship extraction from text
 */

import { Entity, EntityType } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export interface ExtractedRelationship {
  id: string;
  subject: Entity;
  predicate: string;
  object: Entity;
  confidence: number;
  context: string;
  position: {
    start: number;
    end: number;
  };
  metadata: {
    extractedAt: Date;
    model: string;
  };
}

export interface RelationshipPattern {
  name: string;
  pattern: RegExp;
  subjectType: EntityType;
  objectType: EntityType;
  relationshipType: string;
}

export class RelationshipExtractor {
  private patterns: RelationshipPattern[];

  constructor() {
    this.patterns = this.getDefaultPatterns();
  }

  /**
   * Extract relationships from text given pre-extracted entities
   */
  extract(text: string, entities: Entity[]): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];

    // Extract using patterns
    for (const pattern of this.patterns) {
      const matches = text.matchAll(pattern.pattern);

      for (const match of matches) {
        const subjectText = match.groups?.subject || match[1];
        const objectText = match.groups?.object || match[2];

        // Find matching entities
        const subject = this.findMatchingEntity(subjectText, entities, pattern.subjectType);
        const object = this.findMatchingEntity(objectText, entities, pattern.objectType);

        if (subject && object) {
          relationships.push({
            id: uuidv4(),
            subject,
            predicate: pattern.relationshipType,
            object,
            confidence: 0.8,
            context: match[0],
            position: {
              start: match.index || 0,
              end: (match.index || 0) + match[0].length
            },
            metadata: {
              extractedAt: new Date(),
              model: 'pattern-based'
            }
          });
        }
      }
    }

    // Extract proximity-based relationships
    relationships.push(...this.extractProximityRelationships(text, entities));

    return relationships;
  }

  /**
   * Find entity matching text
   */
  private findMatchingEntity(text: string, entities: Entity[], expectedType?: EntityType): Entity | null {
    const normalized = text.toLowerCase().trim();

    for (const entity of entities) {
      if (expectedType && entity.type !== expectedType) {
        continue;
      }

      if (entity.text.toLowerCase().includes(normalized) ||
          normalized.includes(entity.text.toLowerCase())) {
        return entity;
      }
    }

    return null;
  }

  /**
   * Extract relationships based on entity proximity
   */
  private extractProximityRelationships(text: string, entities: Entity[]): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    const sortedEntities = [...entities].sort((a, b) =>
      (a.position?.start || 0) - (b.position?.start || 0)
    );

    // Look for co-occurring entities within proximity threshold
    const proximityThreshold = 100; // characters

    for (let i = 0; i < sortedEntities.length - 1; i++) {
      const entity1 = sortedEntities[i];
      const entity2 = sortedEntities[i + 1];

      if (!entity1.position || !entity2.position) continue;

      const distance = entity2.position.start - entity1.position.end;

      if (distance > 0 && distance < proximityThreshold) {
        // Check for relationship indicators in between
        const betweenText = text.substring(entity1.position.end, entity2.position.start);
        const relationType = this.inferRelationType(entity1.type, entity2.type, betweenText);

        if (relationType) {
          relationships.push({
            id: uuidv4(),
            subject: entity1,
            predicate: relationType,
            object: entity2,
            confidence: 0.6,
            context: text.substring(entity1.position.start, entity2.position.end),
            position: {
              start: entity1.position.start,
              end: entity2.position.end
            },
            metadata: {
              extractedAt: new Date(),
              model: 'proximity-based'
            }
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Infer relationship type based on entity types and connecting text
   */
  private inferRelationType(type1: EntityType, type2: EntityType, betweenText: string): string | null {
    const lower = betweenText.toLowerCase();

    // Person - Organization relationships
    if (type1 === EntityType.PERSON && type2 === EntityType.ORGANIZATION) {
      if (lower.includes('ceo') || lower.includes('founder') || lower.includes('president')) {
        return 'LEADS';
      }
      if (lower.includes('works') || lower.includes('employed') || lower.includes('at')) {
        return 'WORKS_AT';
      }
      if (lower.includes('join') || lower.includes('hire')) {
        return 'JOINED';
      }
    }

    // Person - Person relationships
    if (type1 === EntityType.PERSON && type2 === EntityType.PERSON) {
      if (lower.includes('married') || lower.includes('spouse') || lower.includes('wife') || lower.includes('husband')) {
        return 'MARRIED_TO';
      }
      if (lower.includes('met') || lower.includes('knows') || lower.includes('with')) {
        return 'KNOWS';
      }
      if (lower.includes('partner') || lower.includes('colleague')) {
        return 'WORKS_WITH';
      }
    }

    // Organization - Location relationships
    if (type1 === EntityType.ORGANIZATION && type2 === EntityType.LOCATION) {
      if (lower.includes('headquarter') || lower.includes('based') || lower.includes('in')) {
        return 'LOCATED_IN';
      }
    }

    // Person - Location relationships
    if (type1 === EntityType.PERSON && type2 === EntityType.LOCATION) {
      if (lower.includes('from') || lower.includes('born')) {
        return 'BORN_IN';
      }
      if (lower.includes('lives') || lower.includes('resides') || lower.includes('in')) {
        return 'LIVES_IN';
      }
      if (lower.includes('visited') || lower.includes('traveled') || lower.includes('went')) {
        return 'VISITED';
      }
    }

    // Generic co-occurrence
    if (lower.includes('and') || lower.includes(',')) {
      return 'RELATED_TO';
    }

    return null;
  }

  /**
   * Get default relationship patterns
   */
  private getDefaultPatterns(): RelationshipPattern[] {
    return [
      {
        name: 'works_at',
        pattern: /(?<subject>[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:works?\s+(?:at|for)|is\s+employed\s+by)\s+(?<object>[A-Z][a-zA-Z\s&]+(?:Corp|Inc|LLC|Ltd|Company)?)/gi,
        subjectType: EntityType.PERSON,
        objectType: EntityType.ORGANIZATION,
        relationshipType: 'WORKS_AT'
      },
      {
        name: 'ceo_of',
        pattern: /(?<subject>[A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s+(?:CEO|Chief\s+Executive\s+Officer|founder)\s+of\s+(?<object>[A-Z][a-zA-Z\s&]+)/gi,
        subjectType: EntityType.PERSON,
        objectType: EntityType.ORGANIZATION,
        relationshipType: 'LEADS'
      },
      {
        name: 'located_in',
        pattern: /(?<subject>[A-Z][a-zA-Z\s&]+(?:Corp|Inc|LLC|Ltd)?)\s+(?:is\s+)?(?:headquartered|based|located)\s+in\s+(?<object>[A-Z][a-zA-Z\s,]+)/gi,
        subjectType: EntityType.ORGANIZATION,
        objectType: EntityType.LOCATION,
        relationshipType: 'LOCATED_IN'
      },
      {
        name: 'acquired',
        pattern: /(?<subject>[A-Z][a-zA-Z\s&]+)\s+(?:acquired|bought|purchased)\s+(?<object>[A-Z][a-zA-Z\s&]+)/gi,
        subjectType: EntityType.ORGANIZATION,
        objectType: EntityType.ORGANIZATION,
        relationshipType: 'ACQUIRED'
      },
      {
        name: 'partnered',
        pattern: /(?<subject>[A-Z][a-zA-Z\s&]+)\s+(?:partnered|partnering)\s+with\s+(?<object>[A-Z][a-zA-Z\s&]+)/gi,
        subjectType: EntityType.ORGANIZATION,
        objectType: EntityType.ORGANIZATION,
        relationshipType: 'PARTNERED_WITH'
      }
    ];
  }

  /**
   * Add a custom relationship pattern
   */
  addPattern(pattern: RelationshipPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get all patterns
   */
  getPatterns(): RelationshipPattern[] {
    return [...this.patterns];
  }
}
