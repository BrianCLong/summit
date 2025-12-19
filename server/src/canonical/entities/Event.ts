/**
 * Canonical Entity: Event
 *
 * Represents an occurrence in time
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalEvent extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Event';

  /** Event title/name */
  title: string;

  /** Event type */
  eventType: string;

  /** Start time */
  startTime: Date;

  /** End time */
  endTime?: Date;

  /** Location ID */
  locationId?: string;

  /** Participants */
  participants?: {
    entityId: string;
    role: string;
  }[];

  /** Description */
  description?: string;

  /** Outcome */
  outcome?: string;

  /** Additional properties */
  properties: Record<string, any>;
}
