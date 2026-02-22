// @ts-nocheck
/**
 * Canonical Entity: License
 *
 * Represents a license or permit with bitemporal tracking
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface LicenseIssuer {
  /** Issuing authority name */
  name: string;

  /** Issuing authority ID */
  authorityId?: string;

  /** Jurisdiction */
  jurisdiction?: string;

  /** Country */
  country?: string;
}

export interface CanonicalLicense extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'License';

  /** License number */
  licenseNumber: string;

  /** License type */
  licenseType: string;

  /** License category */
  category?: string;

  /** Holder entity ID */
  holderId?: string;

  /** Holder name */
  holderName?: string;

  /** Issuer information */
  issuer: LicenseIssuer;

  /** Issue date */
  issuedDate?: Date;

  /** Expiry date */
  expiryDate?: Date;

  /** Current status */
  status: 'active' | 'expired' | 'suspended' | 'revoked' | 'pending';

  /** Restrictions or conditions */
  restrictions?: string[];

  /** Additional properties */
  properties: Record<string, unknown>;
}

/**
 * Create a new License entity
 */
export function createLicense(
  data: Omit<CanonicalLicense, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalLicense {
  return {
    ...baseFields,
    ...data,
    entityType: 'License',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
