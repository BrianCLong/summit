/**
 * Canonical Entity: Communication
 *
 * Represents a communication event (email, call, message)
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalCommunication extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Communication';

  /** Communication type (e.g., Email, Call, SMS) */
  commType: string;

  /** Sender ID */
  senderId?: string;

  /** Recipient IDs */
  recipientIds?: string[];

  /** Timestamp */
  sentAt: Date;

  /** Subject/Topic */
  subject?: string;

  /** Content */
  content?: string;

  /** Metadata (headers, duration, etc.) */
  commMetadata?: Record<string, any>;

  /** Additional properties */
  properties: Record<string, any>;
}
