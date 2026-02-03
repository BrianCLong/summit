// @ts-nocheck
/**
 * Canonical Entity: Intelligence
 *
 * Represents intelligence information or assessments
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CanonicalIntelligence extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Intelligence';

  /** Title or summary of the intelligence */
  title: string;

  /** Type of intelligence */
  intelligenceType: string;

  /** Classification level */
  classification?: string;

  /** Source of the intelligence */
  source?: string;

  /** Confidence level */
  confidence?: number;

  /** Reliability rating */
  reliability?: string;

  /** Date the intelligence was collected */
  collectedAt?: Date;

  /** Date the intelligence expires or becomes stale */
  expiresAt?: Date;

  /** Additional properties */
  properties: Record<string, any>;
}
