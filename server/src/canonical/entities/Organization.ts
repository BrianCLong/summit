/**
 * Canonical Entity: Organization
 *
 * Represents an organization, company, or group
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalOrganization extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Organization';

  /** Official name */
  name: string;

  /** Alternative names */
  aliases?: string[];

  /** Registration/Incorporation details */
  registration?: {
    number: string;
    authority: string;
    jurisdiction: string;
    date?: Date;
  };

  /** Type of organization (e.g., Corporation, Government, NGO) */
  orgType?: string;

  /** Industry codes */
  industries?: string[];

  /** Contact information */
  contacts?: {
    type: string;
    value: string;
  }[];

  /** Locations (e.g., HQ, branches) */
  locations?: {
    type: string;
    locationId: string;
    address?: string;
  }[];

  /** Status (e.g., Active, Dissolved) */
  status?: string;

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
