/**
 * Canonical Entity: Location
 *
 * Represents physical locations with varying levels of precision
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface LocationCoordinates {
  /** Latitude */
  latitude: number;

  /** Longitude */
  longitude: number;

  /** Altitude (meters) */
  altitude?: number;

  /** Precision radius (meters) */
  precisionRadius?: number;

  /** Coordinate system */
  coordinateSystem?: string; // default: WGS84
}

export interface LocationAddress {
  /** Street address */
  street?: string;

  /** Building/suite */
  building?: string;

  /** City */
  city?: string;

  /** State/Province/Region */
  region?: string;

  /** Postal code */
  postalCode?: string;

  /** Country */
  country: string;

  /** Formatted address */
  formatted?: string;
}

export interface LocationGeometry {
  /** Geometry type */
  type: 'Point' | 'Polygon' | 'LineString' | 'MultiPoint' | 'MultiPolygon';

  /** GeoJSON coordinates */
  coordinates: any;

  /** Bounding box */
  bbox?: [number, number, number, number];
}

export interface CanonicalLocation extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Location';

  /** Location name */
  name?: string;

  /** Location type */
  locationType:
    | 'address'
    | 'building'
    | 'facility'
    | 'area'
    | 'city'
    | 'region'
    | 'country'
    | 'coordinate'
    | 'other';

  /** Coordinates */
  coordinates?: LocationCoordinates;

  /** Structured address */
  address?: LocationAddress;

  /** Geometry (for areas/polygons) */
  geometry?: LocationGeometry;

  /** What3Words address */
  what3words?: string;

  /** Plus code */
  plusCode?: string;

  /** Parent location */
  parentLocation?: {
    locationId?: string;
    name: string;
  };

  /** Administrative divisions */
  administrativeDivisions?: {
    level: number; // 0=country, 1=state, 2=county, etc.
    code?: string;
    name: string;
  }[];

  /** Time zone */
  timeZone?: string;

  /** Associated entities */
  entities?: {
    entityId?: string;
    entityType: string;
    relationship: string;
  }[];

  /** Jurisdiction(s) */
  jurisdictions?: {
    type: string; // e.g., "law_enforcement", "tax", "regulatory"
    authority: string;
  }[];

  /** Risk indicators */
  riskFlags?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }[];

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Location entity
 */
export function createLocation(
  data: Omit<CanonicalLocation, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalLocation {
  return {
    ...baseFields,
    ...data,
    entityType: 'Location',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
