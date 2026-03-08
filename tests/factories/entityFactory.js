"use strict";
/**
 * Entity Factory
 *
 * Generates test entity data for graph operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityFactory = entityFactory;
exports.entityFactoryBatch = entityFactoryBatch;
exports.personEntityFactory = personEntityFactory;
exports.organizationEntityFactory = organizationEntityFactory;
exports.ipAddressEntityFactory = ipAddressEntityFactory;
exports.domainEntityFactory = domainEntityFactory;
const crypto_1 = require("crypto");
/**
 * Create a test entity with optional overrides
 */
function entityFactory(options = {}) {
    const id = options.id || (0, crypto_1.randomUUID)();
    const type = options.type || 'person';
    const name = options.name || `Test ${type} ${id.slice(0, 8)}`;
    const now = new Date();
    const defaultProperties = {
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
function entityFactoryBatch(count, options = {}) {
    return Array.from({ length: count }, () => entityFactory(options));
}
/**
 * Create a person entity
 */
function personEntityFactory(options = {}) {
    return entityFactory({ ...options, type: 'person' });
}
/**
 * Create an organization entity
 */
function organizationEntityFactory(options = {}) {
    return entityFactory({ ...options, type: 'organization' });
}
/**
 * Create an IP address entity
 */
function ipAddressEntityFactory(options = {}) {
    return entityFactory({ ...options, type: 'ipAddress' });
}
/**
 * Create a domain entity
 */
function domainEntityFactory(options = {}) {
    return entityFactory({ ...options, type: 'domain' });
}
