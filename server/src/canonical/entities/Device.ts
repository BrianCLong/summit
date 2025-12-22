/**
 * Canonical Entity: Device
 *
 * Represents electronic devices (phones, computers, IoT, etc.)
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface DeviceIdentifiers {
    serialNumber?: string;
    imei?: string[];
    macAddresses?: string[];
    ipAddresses?: string[];
    advertisingId?: string;
    uuid?: string;
}

export interface CanonicalDevice extends BaseCanonicalEntity, CanonicalEntityMetadata {
    entityType: 'Device';

    /** Device type */
    deviceType: 'mobile' | 'computer' | 'iot' | 'network' | 'server' | 'vehicle' | 'other';

    /** Model name */
    model?: string;

    /** Manufacturer */
    manufacturer?: string;

    /** Operating system */
    os?: {
        name: string;
        version?: string;
        build?: string;
    };

    /** Identifiers */
    identifiers: DeviceIdentifiers;

    /** Current owner or primary user */
    owner?: {
        entityId?: string;
        name: string;
    };

    /** Last seen location */
    lastLocation?: {
        latitude: number;
        longitude: number;
        timestamp: Date;
    };

    /** Status */
    status?: 'active' | 'inactive' | 'stolen' | 'lost' | 'destroyed' | 'unknown';

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
 * Create a new Device entity
 */
export function createDevice(
    data: Omit<CanonicalDevice, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
    baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
    provenanceId: string,
): CanonicalDevice {
    return {
        ...baseFields,
        ...data,
        entityType: 'Device',
        schemaVersion: '1.0.0',
        provenanceId,
    };
}