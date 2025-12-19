/**
 * Canonical Entity: License
 *
 * Represents a license or permit
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalLicense extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'License';

  /** License number */
  number: string;

  /** Type */
  licenseType: string;

  /** Issued by (Authority ID) */
  issuerId?: string;

  /** Issued to (Entity ID) */
  holderId?: string;

  /** Issue date */
  issuedAt?: Date;

  /** Expiry date */
  expiresAt?: Date;

  /** Status */
  status?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
