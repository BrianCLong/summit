// @ts-nocheck
/**
 * Canonical Entity: Vehicle
 *
 * Represents a vehicle (land, air, sea)
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CanonicalVehicle extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Vehicle';

  /** Vehicle name/ID */
  name: string;

  /** Vehicle type (e.g., Car, Plane, Ship) */
  vehicleType: string;

  /** Registration/Plate */
  registration?: string;

  /** VIN/Hull ID */
  identifier?: string;

  /** Manufacturer/Model */
  make?: string;
  model?: string;
  year?: number;

  /** Owner ID */
  ownerId?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
