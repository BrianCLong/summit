/**
 * Canonical Entity: Event
 *
 * Represents significant occurrences (meetings, transactions, incidents, etc.)
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface EventParticipant {
  /** Participant entity ID */
  entityId?: string;

  /** Participant entity type */
  entityType?: 'Person' | 'Organization' | 'Asset';

  /** Participant name */
  name: string;

  /** Role in the event */
  role: string;

  /** Participation confidence */
  confidence?: number;
}

export interface EventLocation {
  /** Location entity ID */
  locationId?: string;

  /** Location name */
  name?: string;

  /** Coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  /** Address */
  address?: string;
}

export interface EventTiming {
  /** Event start time */
  start: Date;

  /** Event end time */
  end?: Date;

  /** Duration (seconds) */
  durationSeconds?: number;

  /** Time zone */
  timeZone?: string;

  /** Timing precision */
  precision?: 'exact' | 'hour' | 'day' | 'month' | 'year' | 'approximate';
}

export interface CanonicalEvent extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Event';

  /** Event type */
  eventType:
    | 'meeting'
    | 'transaction'
    | 'communication'
    | 'travel'
    | 'incident'
    | 'legal_action'
    | 'contract'
    | 'payment'
    | 'other';

  /** Event name/title */
  name: string;

  /** Event description */
  description?: string;

  /** Event timing */
  timing: EventTiming;

  /** Event location(s) */
  locations?: EventLocation[];

  /** Event participants */
  participants?: EventParticipant[];

  /** Related events */
  relatedEvents?: {
    eventId?: string;
    relationship: string;
    description?: string;
  }[];

  /** Related documents */
  relatedDocuments?: {
    documentId?: string;
    title: string;
    relationship: string;
  }[];

  /** Outcome of the event */
  outcome?: {
    status: string;
    description?: string;
    value?: {
      amount: number;
      currency?: string;
      unit?: string;
    };
  };

  /** Event source */
  source?: {
    sourceType: string;
    sourceId?: string;
    reliability?: 'confirmed' | 'probable' | 'possible' | 'unconfirmed';
  };

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
 * Create a new Event entity
 */
export function createEvent(
  data: Omit<CanonicalEvent, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalEvent {
  return {
    ...baseFields,
    ...data,
    entityType: 'Event',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
