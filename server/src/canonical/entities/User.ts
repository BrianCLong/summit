/**
 * Canonical Entity: User
 *
 * Represents a human operator in the IAM system.
 * distinct from 'Person' which is an intelligence target.
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CanonicalUser extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'User';

  /** Email address */
  email: string;

  /** Username (optional, legacy) */
  username?: string;

  /** Human name */
  firstName?: string;
  lastName?: string;

  /** Assigned Role */
  role: string;

  /** Identity Lifecycle State */
  lifecycleState: 'invited' | 'active' | 'suspended' | 'terminated';

  /** Default Tenant Context */
  defaultTenantId?: string;

  /** Last Login Timestamp */
  lastLogin?: Date;

  /** Security Attributes */
  mfaEnabled: boolean;

  properties: Record<string, any>;
}

export function createUser(
  data: Omit<CanonicalUser, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalUser {
  return {
    ...baseFields,
    ...data,
    entityType: 'User',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
