import { NormalizedEntity, NormalizedRelationship, EntityValidTime } from "./types";
import { generateEntityId, generateRelationshipId } from "./hash";

export function createNormalizedEntity(
  entityType: string,
  canonicalName: string,
  sourceRefs: string[],
  attributes: Record<string, any> = {},
  aliases: string[] = [],
  confidence: number = 0.9,
  validTime: EntityValidTime = { start: new Date().toISOString().split("T")[0], end: null }
): NormalizedEntity {
  const entityId = generateEntityId(entityType, canonicalName);

  return {
    entity_id: entityId,
    entity_type: entityType,
    canonical_name: canonicalName,
    aliases,
    attributes,
    source_refs: sourceRefs,
    confidence,
    valid_time: validTime,
  };
}

export function createNormalizedRelationship(
  sourceId: string,
  targetId: string,
  relationshipType: string,
  sourceRefs: string[],
  attributes: Record<string, any> = {},
  confidence: number = 0.9,
  validTime: EntityValidTime = { start: new Date().toISOString().split("T")[0], end: null }
): NormalizedRelationship {
  const relId = generateRelationshipId(sourceId, targetId, relationshipType);

  return {
    relationship_id: relId,
    source_entity_id: sourceId,
    target_entity_id: targetId,
    relationship_type: relationshipType,
    attributes,
    source_refs: sourceRefs,
    confidence,
    valid_time: validTime,
  };
}
