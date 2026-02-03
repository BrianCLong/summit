// @ts-nocheck
/**
 * Canonical Entity: Communication
 *
 * Represents a communication event with bitemporal tracking
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.js';

export interface CommunicationParticipant {
  /** Entity ID of participant */
  entityId?: string;

  /** Name of participant */
  name?: string;

  /** Role in communication (sender, recipient, cc, bcc) */
  role: 'sender' | 'recipient' | 'cc' | 'bcc' | 'participant';

  /** Contact identifier used */
  contactIdentifier?: string;
}

export interface CommunicationContent {
  /** Subject line (for emails, messages) */
  subject?: string;

  /** Body content */
  body?: string;

  /** Content type */
  contentType?: 'text' | 'html' | 'markdown';

  /** Language */
  language?: string;

  /** Attachments */
  attachments?: {
    filename: string;
    mimeType: string;
    size: number;
    hash?: string;
  }[];
}

export interface CanonicalCommunication extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Communication';

  /** Communication channel */
  channel: 'email' | 'phone' | 'sms' | 'instant_message' | 'video' | 'in_person' | 'postal' | 'other';

  /** Timestamp of communication */
  timestamp: Date;

  /** Duration in seconds (for calls, meetings) */
  durationSeconds?: number;

  /** Participants */
  participants: CommunicationParticipant[];

  /** Content */
  content?: CommunicationContent;

  /** Direction */
  direction?: 'inbound' | 'outbound' | 'internal';

  /** Status */
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';

  /** Thread ID for grouping related communications */
  threadId?: string;

  /** Additional properties */
  properties: Record<string, unknown>;
}

/**
 * Create a new Communication entity
 */
export function createCommunication(
  data: Omit<CanonicalCommunication, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalCommunication {
  return {
    ...baseFields,
    ...data,
    entityType: 'Communication',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
