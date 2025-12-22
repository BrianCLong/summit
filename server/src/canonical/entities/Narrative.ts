/**
 * Canonical Entity: Narrative
 *
 * Represents human-written or generated narratives, reports, or stories
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalNarrative extends BaseCanonicalEntity, CanonicalEntityMetadata {
    entityType: 'Narrative';

    /** Title of the narrative */
    title: string;

    /** The actual text content */
    content: string;

    /** Summary of the narrative */
    summary?: string;

    /** Author information */
    author?: {
        entityId?: string;
        name: string;
    };

    /** Language */
    language?: string;

    /** Classification/Sensitivity */
    classification?: string;

    /** Topics or themes covered */
    topics?: string[];

    /** Linked entities mentioned in the narrative */
    linkedEntities?: {
        entityId: string;
        entityType: string;
        mentionText: string;
        offset?: number;
        length?: number;
    }[];

    /** Status */
    status: 'draft' | 'final' | 'reviewed' | 'archived' | 'superseded';

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
 * Create a new Narrative entity
 */
export function createNarrative(
    data: Omit<CanonicalNarrative, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
    baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
    provenanceId: string,
): CanonicalNarrative {
    return {
        ...baseFields,
        ...data,
        entityType: 'Narrative',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}