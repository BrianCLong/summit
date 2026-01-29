// @ts-nocheck
/**
 * Canonical Entity: Campaign
 *
 * Represents an organized campaign (marketing, influence, political)
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface CanonicalCampaign extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Campaign';

  /** Name */
  name: string;

  /** Type */
  campaignType: string;

  /** Organizer ID */
  organizerId?: string;

  /** Start date */
  startDate?: Date;

  /** End date */
  endDate?: Date;

  /** Objectives */
  objectives?: string[];

  /** Narratives used */
  narrativeIds?: string[];

  /** Additional properties */
  properties: Record<string, any>;
}
