// @ts-nocheck
/**
 * Canonical Entity: Narrative
 *
 * Represents a narrative or storyline with bitemporal tracking
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface NarrativeElement {
  /** Element type */
  type: 'event' | 'claim' | 'evidence' | 'hypothesis' | 'conclusion';

  /** Element content */
  content: string;

  /** Referenced entity IDs */
  entityIds?: string[];

  /** Confidence score */
  confidence?: number;

  /** Sequence order */
  sequenceOrder?: number;

  /** Timestamp */
  timestamp?: Date;
}

export interface CanonicalNarrative extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Narrative';

  /** Narrative title */
  title: string;

  /** Summary */
  summary?: string;

  /** Full narrative text */
  content?: string;

  /** Narrative elements */
  elements?: NarrativeElement[];

  /** Author entity ID */
  authorId?: string;

  /** Author name */
  authorName?: string;

  /** Status */
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';

  /** Classification */
  classification?: string;

  /** Tags */
  tags?: string[];

  /** Related investigation ID */
  investigationId?: string;

  /** Additional properties */
  properties: Record<string, unknown>;
}

/**
 * Create a new Narrative entity
 */
export function createNarrative(
  data: Omit<CanonicalNarrative, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalNarrative {
  return {
    ...baseFields,
    ...data,
    entityType: 'Narrative',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
