/**
 * Canonical Entity: Account
 *
 * Represents an online account or handle on a platform
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalAccount extends BaseCanonicalEntity, CanonicalEntityMetadata {
  // entityType: 'Account'; // This conflicts with 'kind' in BaseCanonicalEntity, removing or unifying

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
  createdAt: Date | string; // Relaxing type

  /** Last activity date */
  lastActiveAt?: Date | string;

  /** Associated owner (Person or Organization) */
  ownerId?: string;

  properties: Record<string, any>;
}

export function createAccount(
  data: Omit<CanonicalAccount, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion' | 'kind'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId' | 'kind'>,
  provenanceId: string,
): CanonicalAccount {
  return {
    ...baseFields,
    ...data,
    kind: 'Account',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
