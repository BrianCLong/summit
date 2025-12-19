/**
 * Canonical Entity: Device
 *
 * Represents a computing device or hardware
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface CanonicalDevice extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Device';

  /** Device name/hostname */
  name: string;

  /** Device type (e.g., Mobile, Laptop, Server, IoT) */
  deviceType: string;

  /** Hardware identifiers (MAC, IMEI, Serial) */
  identifiers?: {
    type: string;
    value: string;
  }[];

  /** OS/Firmware */
  os?: string;

  /** Owner ID */
  ownerId?: string;

  /** Last seen */
  lastSeen?: Date;

  /** Additional properties */
  properties: Record<string, any>;
}
