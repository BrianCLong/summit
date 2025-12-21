/**
 * Canonical Entity: Integration
 *
 * Represents an external system integration.
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CanonicalIntegration extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Integration';

  /** Integration Name */
  name: string;

  /** Provider (e.g., 'github', 'slack') */
  provider: string;

  /** Configuration (excluding secrets) */
  config: Record<string, any>;

  /** Granted Scopes */
  scopes: string[];

  /** Status */
  status: 'active' | 'inactive' | 'error';

  properties: Record<string, any>;
}

export function createIntegration(
  data: Omit<CanonicalIntegration, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalIntegration {
  return {
    ...baseFields,
    ...data,
    entityType: 'Integration',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
