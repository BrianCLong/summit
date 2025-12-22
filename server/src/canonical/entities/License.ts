/**
 * Canonical Entity: License
 *
 * Represents permits, licenses, and certifications
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalLicense extends BaseCanonicalEntity, CanonicalEntityMetadata {
    entityType: 'License';

    /** License type (e.g., driver, medical, business) */
    licenseType: string;

    /** License number */
    licenseNumber: string;

    /** Issuing authority */
    issuingAuthority: {
        entityId?: string;
        name: string;
        country?: string;
        region?: string;
    };

    /** Holder of the license */
    holder: {
        entityId?: string;
        entityType: 'Person' | 'Organization';
        name: string;
    };

    /** Validity period */
    issuedDate?: Date;
    expiryDate?: Date;

    /** Current status */
    status: 'active' | 'expired' | 'suspended' | 'revoked' | 'provisional' | 'unknown';

    /** Scope of authority or permitted activities */
    scope?: string[];

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
 * Create a new License entity
 */
export function createLicense(
    data: Omit<CanonicalLicense, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
    baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
    provenanceId: string,
): CanonicalLicense {
    return {
        ...baseFields,
        ...data,
        entityType: 'License',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}