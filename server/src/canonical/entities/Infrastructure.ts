// @ts-nocheck
/**
 * Canonical Entities: Infrastructure & Devices
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types.ts';

export interface Device extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Device';
  type: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  identifiers: {
    macAddress?: string[];
    imei?: string[];
    ipAddress?: string[];
  };
  ownerId?: string;
  locationId?: string;
}

export interface Vehicle extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Vehicle';
  type: string; // Car, Ship, Aircraft
  make?: string;
  model?: string;
  registrationNumber?: string; // License Plate, Tail Number, IMO
  vin?: string;
  ownerId?: string;
}

export interface Infrastructure extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Infrastructure';
  type: string; // Server, Router, Power Plant, Bridge
  locationId?: string;
  operatorId?: string;
  status: 'active' | 'inactive' | 'damaged';
}

export interface Sensor extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Sensor';
  type: string; // Camera, IoT, Environmental
  locationId?: string;
  status: 'active' | 'inactive';
  lastHeartbeat?: Date;
}
