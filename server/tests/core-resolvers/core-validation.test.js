"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const globals_1 = require("@jest/globals");
const entityCreateMock = globals_1.jest.fn();
const relationshipCreateMock = globals_1.jest.fn();
const investigationCreateMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../src/tenancy/tenantScope.js', () => ({
    resolveTenantId: (tenantId) => tenantId,
}));
globals_1.jest.unstable_mockModule('../../src/db/postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({})),
}));
globals_1.jest.unstable_mockModule('../../src/db/neo4j.js', () => ({
    getNeo4jDriver: globals_1.jest.fn(() => ({})),
}));
globals_1.jest.unstable_mockModule('../../src/repos/EntityRepo.js', () => ({
    EntityRepo: globals_1.jest.fn().mockImplementation(() => ({
        create: entityCreateMock,
        update: globals_1.jest.fn(),
        delete: globals_1.jest.fn(),
        search: globals_1.jest.fn(),
        findById: globals_1.jest.fn(),
    })),
}));
globals_1.jest.unstable_mockModule('../../src/repos/RelationshipRepo.js', () => ({
    RelationshipRepo: globals_1.jest.fn().mockImplementation(() => ({
        create: relationshipCreateMock,
        delete: globals_1.jest.fn(),
        search: globals_1.jest.fn(),
        findById: globals_1.jest.fn(),
        findByEntityId: globals_1.jest.fn(),
        getEntityRelationshipCount: globals_1.jest.fn(() => Promise.resolve({
            incoming: 0,
            outgoing: 0,
        })),
    })),
}));
globals_1.jest.unstable_mockModule('../../src/repos/InvestigationRepo.js', () => ({
    InvestigationRepo: globals_1.jest.fn().mockImplementation(() => ({
        create: investigationCreateMock,
        update: globals_1.jest.fn(),
        delete: globals_1.jest.fn(),
        findById: globals_1.jest.fn(),
        list: globals_1.jest.fn(),
        getStats: globals_1.jest.fn(),
    })),
}));
let coreResolvers;
beforeAll(async () => {
    ({ coreResolvers } = await Promise.resolve().then(() => __importStar(require('../../src/graphql/resolvers/core.js'))));
});
describe('coreResolvers validation', () => {
    it('returns typed GraphQL error when tenant is missing for createEntity', async () => {
        await expect(coreResolvers.Mutation.createEntity({}, { input: { kind: 'Person', props: {} } }, {})).rejects.toMatchObject({
            extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } },
        });
        expect(entityCreateMock).not.toHaveBeenCalled();
    });
    it('rejects investigation updates with schema-invalid status', async () => {
        await expect(coreResolvers.Mutation.updateInvestigation({}, {
            input: {
                id: '00000000-0000-0000-0000-000000000000',
                status: 'DRAFT',
            },
        }, { tenantId: 'tenant-1' })).rejects.toBeInstanceOf(graphql_1.GraphQLError);
    });
});
