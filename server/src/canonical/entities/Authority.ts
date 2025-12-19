/**
 * Canonical Entity: Authority
 *
 * Represents a legal or regulatory authority
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalAuthority extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Authority';

  /** Name */
  name: string;

  /** Jurisdiction */
  jurisdiction: string;

  /** Authority Type */
  authorityType: string;

  /** Additional properties */
  properties: Record<string, any>;
}
