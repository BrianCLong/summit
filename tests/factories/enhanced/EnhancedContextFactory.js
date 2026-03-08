"use strict";
/**
 * Enhanced Context Factory
 *
 * Type-safe factory for generating test GraphQL context objects.
 * Supports authentication, authorization, data sources, and request context.
 *
 * @module tests/factories/enhanced
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedContextFactory = void 0;
exports.createContextForUser = createContextForUser;
exports.createUnauthenticatedContext = createUnauthenticatedContext;
exports.createAdminContext = createAdminContext;
exports.createAnalystContext = createAnalystContext;
exports.createViewerContext = createViewerContext;
const base_1 = require("../base");
const EnhancedUserFactory_1 = require("./EnhancedUserFactory");
/**
 * Create mock data sources
 */
function createMockDataSources() {
    return {
        neo4j: {
            query: jest.fn().mockResolvedValue({ records: [] }),
            run: jest.fn().mockResolvedValue({ records: [] }),
            beginTransaction: jest.fn().mockResolvedValue({
                run: jest.fn(),
                commit: jest.fn(),
                rollback: jest.fn(),
            }),
            close: jest.fn(),
        },
        postgres: {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
            connect: jest.fn().mockResolvedValue({
                query: jest.fn(),
                release: jest.fn(),
            }),
            release: jest.fn(),
            transaction: jest.fn(),
        },
        redis: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
            exists: jest.fn().mockResolvedValue(0),
            expire: jest.fn().mockResolvedValue(1),
            ttl: jest.fn().mockResolvedValue(-1),
        },
        elasticsearch: {
            search: jest.fn().mockResolvedValue({ hits: { hits: [], total: { value: 0 } } }),
            index: jest.fn().mockResolvedValue({ result: 'created' }),
            delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
            bulk: jest.fn().mockResolvedValue({ errors: false }),
        },
    };
}
/**
 * Create mock data loaders
 */
function createMockLoaders() {
    const createLoader = () => ({
        load: jest.fn().mockResolvedValue(null),
        loadMany: jest.fn().mockResolvedValue([]),
        clear: jest.fn(),
        clearAll: jest.fn(),
    });
    return {
        entityLoader: createLoader(),
        userLoader: createLoader(),
        investigationLoader: createLoader(),
        relationshipLoader: createLoader(),
    };
}
/**
 * Enhanced Context Factory for GraphQL resolver testing
 */
exports.enhancedContextFactory = (0, base_1.defineFactory)({
    defaults: () => {
        const user = EnhancedUserFactory_1.enhancedUserFactory.build();
        const now = Date.now();
        return {
            requestId: base_1.random.uuid(),
            user,
            tenant: {
                id: user.tenantId,
                name: 'Test Tenant',
                slug: 'test-tenant',
                settings: {},
                features: ['investigations', 'entities', 'relationships', 'copilot'],
                plan: 'professional',
            },
            permissions: user.permissions,
            roles: [user.role],
            isAuthenticated: true,
            request: {
                id: base_1.random.uuid(),
                ip: '127.0.0.1',
                userAgent: 'Jest Test Runner',
                origin: 'http://localhost:3000',
                method: 'POST',
                path: '/graphql',
                timestamp: new Date(),
            },
            headers: {
                'content-type': 'application/json',
                'x-request-id': base_1.random.uuid(),
            },
            dataSources: createMockDataSources(),
            loaders: createMockLoaders(),
            services: {},
            cache: new Map(),
            startTime: now,
        };
    },
    traits: {
        // Authentication traits
        authenticated: (base) => ({
            user: base.user || EnhancedUserFactory_1.enhancedUserFactory.build(),
            isAuthenticated: true,
        }),
        unauthenticated: {
            user: null,
            tenant: null,
            permissions: [],
            roles: [],
            isAuthenticated: false,
        },
        // Role-based traits
        admin: () => {
            const user = EnhancedUserFactory_1.enhancedUserFactory.buildWithTrait('admin');
            return {
                user,
                permissions: user.permissions,
                roles: ['admin'],
            };
        },
        analyst: () => {
            const user = EnhancedUserFactory_1.enhancedUserFactory.buildWithTrait('analyst');
            return {
                user,
                permissions: user.permissions,
                roles: ['analyst'],
            };
        },
        viewer: () => {
            const user = EnhancedUserFactory_1.enhancedUserFactory.buildWithTrait('viewer');
            return {
                user,
                permissions: user.permissions,
                roles: ['viewer'],
            };
        },
        // Tenant traits
        enterprise: (base) => ({
            tenant: {
                ...base.tenant,
                plan: 'enterprise',
                features: [
                    'investigations',
                    'entities',
                    'relationships',
                    'copilot',
                    'ai-analysis',
                    'advanced-analytics',
                    'custom-reports',
                    'api-access',
                    'sso',
                    'audit-logs',
                ],
            },
        }),
        starter: (base) => ({
            tenant: {
                ...base.tenant,
                plan: 'starter',
                features: ['investigations', 'entities', 'relationships'],
            },
        }),
        free: (base) => ({
            tenant: {
                ...base.tenant,
                plan: 'free',
                features: ['investigations', 'entities'],
            },
        }),
        // Multi-tenant traits
        multiTenant: () => ({
            tenant: {
                id: base_1.random.uuid(),
                name: `Tenant ${base_1.random.string(6)}`,
                slug: `tenant-${base_1.random.string(6)}`,
                settings: {},
                features: ['investigations', 'entities', 'relationships'],
                plan: 'professional',
            },
        }),
        // Request context traits
        fromBrowser: (base) => ({
            request: {
                ...base.request,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                origin: 'https://app.intelgraph.io',
            },
        }),
        fromApi: (base) => ({
            request: {
                ...base.request,
                userAgent: 'IntelGraph-API-Client/1.0',
                origin: '',
            },
            headers: {
                ...base.headers,
                'x-api-key': `api-key-${base_1.random.string(32)}`,
            },
        }),
        fromCli: (base) => ({
            request: {
                ...base.request,
                userAgent: 'IntelGraph-CLI/1.0',
                origin: '',
            },
        }),
        // With specific services
        withAuthService: (base) => ({
            services: {
                ...base.services,
                auth: {
                    verifyToken: jest.fn().mockResolvedValue(base.user),
                    hasPermission: jest.fn().mockReturnValue(true),
                    login: jest.fn(),
                    logout: jest.fn(),
                },
            },
        }),
        withGraphService: (base) => ({
            services: {
                ...base.services,
                graph: {
                    createEntity: jest.fn(),
                    updateEntity: jest.fn(),
                    deleteEntity: jest.fn(),
                    createRelationship: jest.fn(),
                    findPath: jest.fn(),
                    traverseGraph: jest.fn(),
                },
            },
        }),
        withCopilotService: (base) => ({
            services: {
                ...base.services,
                copilot: {
                    analyze: jest.fn(),
                    suggest: jest.fn(),
                    explain: jest.fn(),
                    summarize: jest.fn(),
                },
            },
        }),
    },
});
/**
 * Create an authenticated context for a specific user
 */
function createContextForUser(user) {
    return exports.enhancedContextFactory.build({
        user,
        permissions: user.permissions,
        roles: [user.role],
        isAuthenticated: true,
        tenant: {
            id: user.tenantId,
            name: 'Test Tenant',
            slug: 'test-tenant',
            settings: {},
            features: ['investigations', 'entities', 'relationships', 'copilot'],
            plan: 'professional',
        },
    });
}
/**
 * Create an unauthenticated context
 */
function createUnauthenticatedContext() {
    return exports.enhancedContextFactory.buildWithTrait('unauthenticated');
}
/**
 * Create an admin context
 */
function createAdminContext() {
    return exports.enhancedContextFactory.buildWithTrait('admin');
}
/**
 * Create an analyst context
 */
function createAnalystContext() {
    return exports.enhancedContextFactory.buildWithTrait('analyst');
}
/**
 * Create a viewer context
 */
function createViewerContext() {
    return exports.enhancedContextFactory.buildWithTrait('viewer');
}
exports.default = exports.enhancedContextFactory;
