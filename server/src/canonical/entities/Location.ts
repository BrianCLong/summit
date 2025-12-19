/**
 * Canonical Entity: Location
 *
 * Represents a physical or logical location
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalLocation extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Location';

  /** Location name */
  name?: string;

  /** Address components */
  address?: {
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country: string;
  };

  /** Coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  /** Type (e.g., City, Building, Region, IP) */
  locationType: string;

  /** Timezone */
  timezone?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
