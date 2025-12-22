/**
 * Canonical Entity: Communication
 *
 * Represents communication events such as emails, calls, messages, etc.
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CommunicationParticipant {
    entityId?: string;
    entityType?: 'Person' | 'Organization';
    name: string;
    address?: string; // email, phone, handle, etc.
    role: 'sender' | 'recipient' | 'cc' | 'bcc' | 'participant';
}

export interface CanonicalCommunication extends BaseCanonicalEntity, CanonicalEntityMetadata {
    entityType: 'Communication';

    /** Type of communication */
    communicationType: 'email' | 'call' | 'message' | 'meeting' | 'social_media' | 'other';

    /** Subject or title */
    subject?: string;

    /** Content or transcript */
    content?: string;

    /** Participants involved */
    participants: CommunicationParticipant[];

    /** Timestamp of the communication */
    timestamp: Date;

    /** Duration in seconds (for calls/meetings) */
    duration?: number;

    /** Direction */
    direction?: 'inbound' | 'outbound' | 'internal' | 'unknown';

    /** Status */
    status?: 'completed' | 'missed' | 'failed' | 'scheduled' | 'draft';

    /** Encryption status */
    encrypted?: boolean;

    /** Protocol used */
    protocol?: string;

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