/**
 * Test Data Factories
 *
 * This module provides factory functions for generating consistent
 * test data across the test suite.
 *
 * Usage:
 *   import { userFactory, entityFactory, investigationFactory } from '@tests/factories';
 *
 *   const user = userFactory({ email: 'test@example.com' });
 *   const entity = entityFactory({ type: 'person' });
 */

export * from './userFactory';
export * from './entityFactory';
export * from './investigationFactory';
export * from './relationshipFactory';
export * from './graphFactory';
export * from './requestFactory';
export * from './contextFactory';
