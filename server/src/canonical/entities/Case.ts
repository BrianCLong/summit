/**
 * Canonical Entity: Case
 *
 * Represents an investigation or legal case
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalCase extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Case';

  /** Case title */
  title: string;

  /** Case reference number */
  referenceNumber: string;

  /** Status */
  status: string;

  /** Priority */
  priority: string;

  /** Assigned to */
  assigneeId?: string;

  /** Start date */
  openedAt: Date;

  /** End date */
  closedAt?: Date;

  /** Description */
  description?: string;

  /** Related entities */
  relatedEntities?: string[];

  /** Additional properties */
  properties: Record<string, any>;
}
