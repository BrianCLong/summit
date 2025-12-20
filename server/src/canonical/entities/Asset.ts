/**
 * Canonical Entity: Asset
 *
 * Represents physical or digital assets (vehicles, real estate, cryptocurrency, etc.)
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface AssetIdentifiers {
  /** Serial numbers */
  serialNumbers?: string[];

  /** Registration numbers */
  registrationNumbers?: {
    jurisdiction: string;
    type: string;
    number: string;
  }[];

  /** VIN (for vehicles) */
  vin?: string;

  /** IMEI (for mobile devices) */
  imei?: string;

  /** Blockchain addresses (for crypto assets) */
  blockchainAddresses?: {
    blockchain: string;
    address: string;
  }[];

  /** Asset-specific IDs */
  customIdentifiers?: {
    type: string;
    value: string;
  }[];
}

export interface AssetOwnership {
  /** Current owner */
  owner?: {
    entityId?: string;
    entityType?: 'Person' | 'Organization';
    name: string;
  };

  /** Ownership percentage (for shared ownership) */
  ownershipPercent?: number;

  /** Ownership start date */
  from?: Date;

  /** Ownership end date */
  to?: Date;

  /** Type of ownership */
  ownershipType?: 'full' | 'partial' | 'beneficial' | 'legal' | 'nominee';
}

export interface CanonicalAsset extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Asset';

  /** Asset type */
  assetType:
    | 'vehicle'
    | 'real_estate'
    | 'cryptocurrency'
    | 'financial_account'
    | 'intellectual_property'
    | 'equipment'
    | 'other';

  /** Asset name/description */
  name: string;

  /** Identifiers */
  identifiers: AssetIdentifiers;

  /** Ownership information */
  ownership?: AssetOwnership[];

  /** Asset value */
  value?: {
    amount: number;
    currency: string;
    asOf: Date;
    estimatedBy?: string;
  };

  /** Location (for physical assets) */
  location?: {
    locationId?: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    lastSeen?: Date;
  };

  /** Status */
  status?: 'active' | 'inactive' | 'seized' | 'frozen' | 'disposed' | 'unknown';

  /** Acquisition details */
  acquisition?: {
    date?: Date;
    method?: string;
    price?: {
      amount: number;
      currency: string;
    };
    from?: {
      entityId?: string;
      name: string;
    };
  };

  /** Disposition details (if sold/transferred) */
  disposition?: {
    date?: Date;
    method?: string;
    price?: {
      amount: number;
      currency: string;
    };
    to?: {
      entityId?: string;
      name: string;
    };
  };

  /** Risk indicators */
  riskFlags?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }[];

  /** Asset-specific properties */
  properties: Record<string, any>;
}

/**
 * Create a new Asset entity
 */
export function createAsset(
  data: Omit<CanonicalAsset, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalAsset {
  return {
    ...baseFields,
    ...data,
    entityType: 'Asset',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
