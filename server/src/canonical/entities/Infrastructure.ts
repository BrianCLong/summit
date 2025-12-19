/**
 * Canonical Entity: Infrastructure
 *
 * Represents physical or digital infrastructure
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalInfrastructure extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Infrastructure';

  /** Name/ID */
  name: string;

  /** Type (e.g., PowerPlant, Network, Pipeline) */
  infraType: string;

  /** Location ID */
  locationId?: string;

  /** Operator ID */
  operatorId?: string;

  /** Status */
  status?: string;

  /** Capacity/Metrics */
  capacity?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
