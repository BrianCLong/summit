/**
 * Context Factory
 *
 * Generates test context objects for GraphQL resolvers and services
 */

import { randomUUID } from 'crypto';
import { userFactory, type TestUser } from './userFactory';

export interface TestContext {
  requestId: string;
  user: TestUser | null;
  tenant: {
    id: string;
    name: string;
  } | null;
  permissions: string[];
  headers: Record<string, string>;
  dataSources?: any;
  loaders?: any;
}

export interface ContextFactoryOptions {
  requestId?: string;
  user?: TestUser | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
  permissions?: string[];
  headers?: Record<string, string>;
  dataSources?: any;
  loaders?: any;
}

/**
 * Create a test GraphQL context
 */
export function contextFactory(options: ContextFactoryOptions = {}): TestContext {
  const requestId = options.requestId || randomUUID();
  const user = options.user !== undefined ? options.user : userFactory();
  const tenant = options.tenant !== undefined
    ? options.tenant
    : user
    ? { id: user.tenantId, name: 'Test Tenant' }
    : null;

  return {
    requestId,
    user,
    tenant,
    permissions: options.permissions || user?.permissions || [],
    headers: options.headers || {},
    dataSources: options.dataSources || {},
    loaders: options.loaders || {},
  };
}

/**
 * Create an authenticated context
 */
export function authenticatedContextFactory(options: ContextFactoryOptions = {}): TestContext {
  const user = options.user || userFactory();
  return contextFactory({ ...options, user });
}

/**
 * Create an unauthenticated context
 */
export function unauthenticatedContextFactory(options: ContextFactoryOptions = {}): TestContext {
  return contextFactory({ ...options, user: null, tenant: null, permissions: [] });
}

/**
 * Create an admin context
 */
export function adminContextFactory(options: ContextFactoryOptions = {}): TestContext {
  const user = userFactory({ role: 'admin' });
  return contextFactory({ ...options, user });
}
