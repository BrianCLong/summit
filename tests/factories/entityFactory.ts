/**
 * Entity Factory
 *
 * Generates test entity data for graph operations
 */

import { randomUUID } from 'crypto';

export interface TestEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityFactoryOptions {
  id?: string;
  type?: string;
  name?: string;
  properties?: Record<string, any>;
  labels?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a test entity with optional overrides
 */
export function entityFactory(options: EntityFactoryOptions = {}): TestEntity {
  const id = options.id || randomUUID();
  const type = options.type || 'person';
  const name = options.name || `Test ${type} ${id.slice(0, 8)}`;
  const now = new Date();

  const defaultProperties: Record<string, Record<string, any>> = {
    person: {
      firstName: 'Test',
      lastName: 'Person',
      email: 'test@example.com',
    },
    organization: {
      orgName: 'Test Organization',
      industry: 'Technology',
    },
    ipAddress: {
      address: '192.168.1.1',
      version: 'IPv4',
    },
    domain: {
      domain: 'example.com',
      tld: 'com',
    },
  };

  return {
    id,
    type,
    name,
    properties: options.properties || defaultProperties[type] || {},
    labels: options.labels || [type, 'Entity'],
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
  };
}

/**
 * Create multiple test entities
 */
export function entityFactoryBatch(count: number, options: EntityFactoryOptions = {}): TestEntity[] {
  return Array.from({ length: count }, () => entityFactory(options));
}

/**
 * Create a person entity
 */
export function personEntityFactory(options: EntityFactoryOptions = {}): TestEntity {
  return entityFactory({ ...options, type: 'person' });
}

/**
 * Create an organization entity
 */
export function organizationEntityFactory(options: EntityFactoryOptions = {}): TestEntity {
  return entityFactory({ ...options, type: 'organization' });
}

/**
 * Create an IP address entity
 */
export function ipAddressEntityFactory(options: EntityFactoryOptions = {}): TestEntity {
  return entityFactory({ ...options, type: 'ipAddress' });
}

/**
 * Create a domain entity
 */
export function domainEntityFactory(options: EntityFactoryOptions = {}): TestEntity {
  return entityFactory({ ...options, type: 'domain' });
}
