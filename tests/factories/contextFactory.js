"use strict";
/**
 * Context Factory
 *
 * Generates test context objects for GraphQL resolvers and services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextFactory = contextFactory;
exports.authenticatedContextFactory = authenticatedContextFactory;
exports.unauthenticatedContextFactory = unauthenticatedContextFactory;
exports.adminContextFactory = adminContextFactory;
const crypto_1 = require("crypto");
const userFactory_1 = require("./userFactory");
/**
 * Create a test GraphQL context
 */
function contextFactory(options = {}) {
    const requestId = options.requestId || (0, crypto_1.randomUUID)();
    const user = options.user !== undefined ? options.user : (0, userFactory_1.userFactory)();
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
function authenticatedContextFactory(options = {}) {
    const user = options.user || (0, userFactory_1.userFactory)();
    return contextFactory({ ...options, user });
}
/**
 * Create an unauthenticated context
 */
function unauthenticatedContextFactory(options = {}) {
    return contextFactory({ ...options, user: null, tenant: null, permissions: [] });
}
/**
 * Create an admin context
 */
function adminContextFactory(options = {}) {
    const user = (0, userFactory_1.userFactory)({ role: 'admin' });
    return contextFactory({ ...options, user });
}
