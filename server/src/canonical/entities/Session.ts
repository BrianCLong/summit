/**
 * Canonical Entity: Session
 *
 * Represents an authenticated session.
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CanonicalSession extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Session';

  /** User ID */
  userId: string;

  /** Device/Fingerprint ID */
  deviceId?: string;

  /** IP Address */
  ipAddress?: string;

  /** User Agent */
  userAgent?: string;

  /** Expiration Time */
  expiresAt: Date;

  /** Revocation Status */
  isRevoked: boolean;

  properties: Record<string, any>;
}

export function createSession(
  data: Omit<CanonicalSession, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalSession {
  return {
    ...baseFields,
    ...data,
    entityType: 'Session',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
