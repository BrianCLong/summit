/**
 * Canonical Entity: Asset
 *
 * Represents physical or digital assets
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalAsset extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Asset';

  /** Asset name/identifier */
  name: string;

  /** Asset type (e.g., Server, Database, RealEstate, IP) */
  assetType: string;

  /** Owner entity ID */
  ownerId?: string;

  /** Value estimation */
  value?: {
    amount: number;
    currency: string;
    date: Date;
  };

  /** Location of the asset */
  locationId?: string;

  /** Specifications/Attributes */
  specs?: Record<string, any>;

  /** Status */
  status?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
