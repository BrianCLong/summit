// @ts-nocheck
/**
 * Canonical Entity: Indicator
 *
 * Represents a threat indicator or signal
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface CanonicalIndicator extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Indicator';

  /** Indicator value (e.g., IP, Hash, Domain) */
  value: string;

  /** Type */
  indicatorType: string;

  /** Source */
  source?: string;

  /** Confidence */
  confidence?: number;

  /** Severity */
  severity?: string;

  /** First seen */
  firstSeen?: Date;

  /** Last seen */
  lastSeen?: Date;

  /** Additional properties */
  properties: Record<string, any>;
}
