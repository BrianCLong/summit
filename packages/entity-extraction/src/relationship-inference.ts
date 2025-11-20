import type { ExtractedEntity, InferredRelationship, RelationshipType } from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Relationship Inference Engine
 * Infers relationships between extracted entities
 */
export class RelationshipInferenceEngine {
  /**
   * Infer relationships between entities
   */
  inferRelationships(
    entities: ExtractedEntity[],
    text: string
  ): InferredRelationship[] {
    const relationships: InferredRelationship[] = [];

    // Infer proximity-based relationships
    relationships.push(...this.inferProximityRelationships(entities, text));

    // Infer pattern-based relationships
    relationships.push(...this.inferPatternRelationships(entities, text));

    return relationships;
  }

  /**
   * Infer relationships based on entity proximity in text
   */
  private inferProximityRelationships(
    entities: ExtractedEntity[],
    text: string
  ): InferredRelationship[] {
    const relationships: InferredRelationship[] = [];
    const maxDistance = 100; // Maximum character distance to consider related

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        const distance = Math.abs(entity1.span.start - entity2.span.start);

        if (distance <= maxDistance) {
          const type = this.determineRelationshipType(entity1, entity2);

          if (type) {
            relationships.push({
              id: uuidv4(),
              type,
              sourceEntityId: entity1.id!,
              targetEntityId: entity2.id!,
              confidence: 0.6 - (distance / maxDistance) * 0.3, // Decrease confidence with distance
              evidence: text.substring(
                Math.min(entity1.span.start, entity2.span.start),
                Math.max(entity1.span.end, entity2.span.end)
              )
            });
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Infer relationships based on text patterns
   */
  private inferPatternRelationships(
    entities: ExtractedEntity[],
    text: string
  ): InferredRelationship[] {
    const relationships: InferredRelationship[] = [];

    // Pattern: Person "works at/employed by" Organization
    const employmentPatterns = [
      /works at/i,
      /employed by/i,
      /employee of/i,
      /works for/i
    ];

    // Pattern: Person "located in/from" Location
    const locationPatterns = [
      /located in/i,
      /from/i,
      /based in/i,
      /in/i
    ];

    // Pattern: Organization "owns" Organization/Person
    const ownershipPatterns = [
      /owns/i,
      /owned by/i,
      /subsidiary of/i,
      /parent company/i
    ];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        const between = text.substring(entity1.span.end, entity2.span.start);

        // Check for employment relationship
        if (
          entity1.kind === 'Person' &&
          entity2.kind === 'Org' &&
          employmentPatterns.some(p => p.test(between))
        ) {
          relationships.push({
            id: uuidv4(),
            type: 'employedBy',
            sourceEntityId: entity1.id!,
            targetEntityId: entity2.id!,
            confidence: 0.8,
            evidence: `${entity1.text} ${between} ${entity2.text}`
          });
        }

        // Check for location relationship
        if (
          (entity1.kind === 'Person' || entity1.kind === 'Org') &&
          entity2.kind === 'Location' &&
          locationPatterns.some(p => p.test(between))
        ) {
          relationships.push({
            id: uuidv4(),
            type: 'locatedAt',
            sourceEntityId: entity1.id!,
            targetEntityId: entity2.id!,
            confidence: 0.75,
            evidence: `${entity1.text} ${between} ${entity2.text}`
          });
        }

        // Check for ownership relationship
        if (
          entity1.kind === 'Org' &&
          entity2.kind === 'Org' &&
          ownershipPatterns.some(p => p.test(between))
        ) {
          relationships.push({
            id: uuidv4(),
            type: 'ownedBy',
            sourceEntityId: entity1.id!,
            targetEntityId: entity2.id!,
            confidence: 0.8,
            evidence: `${entity1.text} ${between} ${entity2.text}`
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Determine relationship type based on entity kinds
   */
  private determineRelationshipType(
    entity1: ExtractedEntity,
    entity2: ExtractedEntity
  ): RelationshipType | null {
    const kind1 = entity1.kind;
    const kind2 = entity2.kind;

    // Person <-> Location
    if (
      (kind1 === 'Person' && kind2 === 'Location') ||
      (kind1 === 'Location' && kind2 === 'Person')
    ) {
      return 'locatedAt';
    }

    // Person <-> Organization
    if (
      (kind1 === 'Person' && kind2 === 'Org') ||
      (kind1 === 'Org' && kind2 === 'Person')
    ) {
      return 'memberOf';
    }

    // Organization <-> Location
    if (
      (kind1 === 'Org' && kind2 === 'Location') ||
      (kind1 === 'Location' && kind2 === 'Org')
    ) {
      return 'locatedAt';
    }

    // Default relationship
    return 'relatesTo';
  }
}
