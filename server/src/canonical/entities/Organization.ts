/**
 * Canonical Entity: Organization
 *
 * Represents a business, government agency, NGO, or other organizational entity
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface OrganizationIdentifiers {
  /** Legal registration numbers */
  registrationNumbers?: {
    jurisdiction: string;
    type: string;
    number: string;
  }[];

  /** Tax IDs */
  taxIds?: {
    jurisdiction: string;
    type: string;
    value: string;
  }[];

  /** Stock ticker symbols */
  tickers?: {
    exchange: string;
    symbol: string;
  }[];

  /** LEI (Legal Entity Identifier) */
  lei?: string;

  /** DUNS number */
  duns?: string;

  /** Websites */
  websites?: string[];
}

export interface OrganizationAddress {
  /** Street address */
  street?: string;

  /** City */
  city?: string;

  /** State/Province */
  region?: string;

  /** Postal code */
  postalCode?: string;

  /** Country */
  country: string;

  /** Address type */
  type: 'registered' | 'headquarters' | 'branch' | 'mailing';

  /** Coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface CanonicalOrganization extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Organization';

  /** Organization legal name */
  legalName: string;

  /** Common/trading names */
  commonNames?: string[];

  /** Organization type */
  organizationType:
    | 'corporation'
    | 'partnership'
    | 'nonprofit'
    | 'government'
    | 'international_org'
    | 'other';

  /** Identifiers */
  identifiers: OrganizationIdentifiers;

  /** Addresses */
  addresses?: OrganizationAddress[];

  /** Date of incorporation/establishment */
  establishedDate?: Date;

  /** Date of dissolution (if applicable) */
  dissolvedDate?: Date;

  /** Jurisdiction of incorporation */
  jurisdiction?: string;

  /** Industry classifications */
  industries?: {
    system: string; // e.g., "NAICS", "SIC", "ISIC"
    code: string;
    description: string;
  }[];

  /** Parent organization */
  parentOrganization?: {
    organizationId?: string;
    organizationName: string;
  };

  /** Subsidiaries */
  subsidiaries?: {
    organizationId?: string;
    organizationName: string;
    ownershipPercent?: number;
  }[];

  /** Key people */
  keyPeople?: {
    personId?: string;
    name: string;
    role: string;
    from?: Date;
    to?: Date;
  }[];

  /** Risk indicators */
  riskFlags?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }[];

  /** Current status */
  status?: 'active' | 'inactive' | 'dissolved' | 'suspended' | 'unknown';

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Organization entity
 */
export function createOrganization(
  data: Omit<CanonicalOrganization, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalOrganization {
  return {
    ...baseFields,
    ...data,
    entityType: 'Organization',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
