/**
 * Canonical Entity: Narrative
 *
 * Represents a narrative or story arc
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalNarrative extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Narrative';

  /** Title */
  title: string;

  /** Description */
  description?: string;

  /** Claims involved */
  claims?: string[];

  /** Key themes */
  themes?: string[];

  /** Target audience */
  audience?: string;

  /** Sentiment */
  sentiment?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
