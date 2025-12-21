/**
 * Canonical Entity: Service Account
 *
 * Represents a machine identity for internal services or bots.
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CanonicalServiceAccount extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'ServiceAccount';

  /** Display Name */
  name: string;

  /** Description */
  description?: string;

  /** Owner ID (Human who manages this account) */
  ownerId: string;

  /** Last Used Timestamp */
  lastUsedAt?: Date;

  /** Assigned Role */
  role: string;

  /** Status */
  status: 'active' | 'disabled';

  properties: Record<string, any>;
}

export function createServiceAccount(
  data: Omit<CanonicalServiceAccount, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalServiceAccount {
  return {
    ...baseFields,
    ...data,
    entityType: 'ServiceAccount',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
