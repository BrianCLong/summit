/**
 * Canonical Entity: Authority
 *
 * Represents a legal or regulatory authority
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalAuthority extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Authority';

  /** Name of the authority */
  name: string;

  /** Jurisdiction (country, state, international) */
  jurisdiction: string;

  /** Type of authority (court, law_enforcement, regulator, tribunal) */
  type: string;

  /** Website or reference URL */
  url?: string;

  /** Contact information */
  contact?: {
    address?: string;
    email?: string;
    phone?: string;
  };

  properties: Record<string, any>;
}

export function createAuthority(
  data: Omit<CanonicalAuthority, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalAuthority {
  return {
    ...baseFields,
    ...data,
    entityType: 'Authority',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
