// @ts-nocheck
/**
 * Canonical Entity: Sensor
 *
 * Represents a sensor or data collection point
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface CanonicalSensor extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Sensor';

  /** Name/ID */
  name: string;

  /** Type */
  sensorType: string;

  /** Location ID */
  locationId?: string;

  /** Platform/Device ID */
  platformId?: string;

  /** Status */
  status?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
