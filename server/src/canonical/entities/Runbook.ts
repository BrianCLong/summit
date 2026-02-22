// @ts-nocheck
/**
 * Canonical Entity: Runbook
 *
 * Represents an operational runbook or procedure
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface CanonicalRunbook extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Runbook';

  /** Title */
  title: string;

  /** Version */
  version: string;

  /** Status (Draft, Active, Deprecated) */
  status: string;

  /** Author ID */
  authorId?: string;

  /** Steps */
  steps?: {
    order: number;
    description: string;
    action?: string;
  }[];

  /** Additional properties */
  properties: Record<string, unknown>;
}
