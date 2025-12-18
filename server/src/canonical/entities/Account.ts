/**
 * Canonical Entity: Account
 *
 * Represents an online account or handle on a platform
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalAccount extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Account';

  /** Platform or service name (e.g., 'Twitter', 'GitHub', 'Bank of America') */
  platform: string;

  /** Username or handle */
  username: string;

  /** Unique identifier on the platform (e.g., user ID) */
  platformId?: string;

  /** URL to the profile */
  url?: string;

  /** Display name */
  displayName?: string;

  /** Account status */
  status?: 'active' | 'suspended' | 'deleted' | 'private' | 'unknown';

  /** Creation date on the platform */
  createdAt?: Date;

  /** Last activity date */
  lastActiveAt?: Date;

  /** Associated owner (Person or Organization) */
  ownerId?: string;

  properties: Record<string, any>;
}

export function createAccount(
  data: Omit<CanonicalAccount, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalAccount {
  return {
    ...baseFields,
    ...data,
    entityType: 'Account',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
