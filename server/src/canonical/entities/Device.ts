// @ts-nocheck
/**
 * Canonical Entity: Device
 *
 * Represents a device or hardware with bitemporal tracking
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface DeviceIdentifiers {
  /** Serial number */
  serialNumber?: string;

  /** MAC addresses */
  macAddresses?: string[];

  /** IMEI numbers */
  imeiNumbers?: string[];

  /** UUID/GUID */
  uuid?: string;

  /** IP addresses (historical) */
  ipAddresses?: {
    address: string;
    type: 'ipv4' | 'ipv6';
    observedAt: Date;
  }[];
}

export interface DeviceSpecs {
  /** Manufacturer */
  manufacturer?: string;

  /** Model */
  model?: string;

  /** Operating system */
  operatingSystem?: string;

  /** OS version */
  osVersion?: string;

  /** Hardware type */
  hardwareType?: 'mobile' | 'desktop' | 'laptop' | 'server' | 'iot' | 'network' | 'other';
}

export interface CanonicalDevice extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Device';

  /** Device name */
  name: string;

  /** Device identifiers */
  identifiers: DeviceIdentifiers;

  /** Device specifications */
  specs?: DeviceSpecs;

  /** Owner entity ID */
  ownerId?: string;

  /** Current status */
  status?: 'active' | 'inactive' | 'compromised' | 'decommissioned' | 'unknown';

  /** Last seen timestamp */
  lastSeen?: Date;

  /** Location */
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    observedAt: Date;
  };

  /** Additional properties */
  properties: Record<string, unknown>;
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
