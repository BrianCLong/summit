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
const globals_1 = require("@jest/globals");
const apollo_server_testing_1 = require("apollo-server-testing");
const apollo_server_express_1 = require("apollo-server-express");
let typeDefs;
let resolvers;
let neo;
let parseTaxonomy;
let ingestTaxonomy;
const run = process.env.RUN_DOCUMENT_TESTS === 'true';
const describeIf = run ? globals_1.describe : globals_1.describe.skip;
describeIf('GraphQL Document API', () => {
    let server;
    let testClient;
    let createdDocId;
    (0, globals_1.beforeAll)(async () => {
        if (!run)
            return;
        ({ typeDefs } = await Promise.resolve().then(() => __importStar(require('../../src/graphql/schema-combined.js'))));
        ({ resolvers } = await Promise.resolve().then(() => __importStar(require('../../src/graphql/resolvers-combined.js'))));
        ({ neo } = await Promise.resolve().then(() => __importStar(require('../../src/db/neo4j.js'))));
        ({ parseTaxonomy, ingestTaxonomy } = await Promise.resolve().then(() => __importStar(require('../../../scripts/ingest-taxonomy.js'))));
        server = new apollo_server_express_1.ApolloServer({
            typeDefs,
            resolvers,
            context: () => ({ user: { tenantId: 'test-tenant' } }),
        });
        testClient = (0, apollo_server_testing_1.createTestClient)(server);
        // Run the ingestion script to populate the database with the taxonomy
        const taxonomy = parseTaxonomy();
        await ingestTaxonomy(taxonomy);
        // Create a document to be used in tests
        const response = await testClient.mutate({
            mutation: `
        mutation CreateDocument($input: DocumentInput!) {
          createDocument(input: $input) {
            id
          }
        }
      `,
            variables: {
                input: {
                    tenantId: 'test-tenant',
                    name: 'My Test Invoice',
                    category: 'Finance',
                },
            },
        });
        createdDocId = response.data.createDocument.id;
    });
    (0, globals_1.afterAll)(async () => {
        if (!run)
            return;
        await neo.run('MATCH (d:Document) DETACH DELETE d');
        await neo.run('MATCH (c:DocumentCategory) DETACH DELETE c');
    });
    (0, globals_1.it)('creates a document idempotently and updates properties on match', async () => {
        const createMutation = `
      mutation CreateDocument($input: DocumentInput!) {
        createDocument(input: $input) {
          id
          category
          subType
          entity {
            props
          }
        }
      }
    `;
        const variables1 = {
            input: {
                tenantId: 'test-tenant',
                name: 'My Test NDA',
                category: 'Legal',
                props: { custom: 'value1' },
            },
        };
        const variables2 = {
            input: {
                tenantId: 'test-tenant',
                name: 'My Test NDA',
                category: 'Legal',
                props: { custom: 'value2' },
            },
        };
        const response1 = await testClient.mutate({ mutation: createMutation, variables: variables1 });
        const response2 = await testClient.mutate({ mutation: createMutation, variables: variables2 });
        (0, globals_1.expect)(response1.data.createDocument.id).toBe(response2.data.createDocument.id);
        (0, globals_1.expect)(response2.data.createDocument.entity.props.custom).toBe('value2');
        const countResponse = await neo.run('MATCH (d:Document {name: "My Test NDA", tenantId: "test-tenant"}) RETURN count(d) as count');
        (0, globals_1.expect)(countResponse.records[0].get('count').low).toBe(1);
    });
    (0, globals_1.it)('fetches a single document by ID', async () => {
        const response = await testClient.query({
            query: `
        query Document($id: ID!, $tenantId: String!) {
          document(id: $id, tenantId: $tenantId) {
            id
            category
            subType
          }
        }
      `,
            variables: {
                id: createdDocId,
                tenantId: 'test-tenant',
            },
        });
        (0, globals_1.expect)(response.data.document.id).toBe(createdDocId);
        (0, globals_1.expect)(response.data.document.category).toBe('Finance');
        (0, globals_1.expect)(response.data.document.subType).toBe('My Test Invoice');
    });
    (0, globals_1.it)('returns null for a non-existent document', async () => {
        const response = await testClient.query({
            query: `
        query Document($id: ID!, $tenantId: String!) {
          document(id: $id, tenantId: $tenantId) {
            id
          }
        }
      `,
            variables: {
                id: 'non-existent-id',
                tenantId: 'test-tenant',
            },
        });
        (0, globals_1.expect)(response.data.document).toBeNull();
    });
    (0, globals_1.it)('fetches documents with name filter', async () => {
        const response = await testClient.query({
            query: `
        query Documents($tenantId: String!, $name: String) {
          documents(tenantId: $tenantId, name: $name) {
            id
            category
            subType
            variants
          }
        }
      `,
            variables: {
                tenantId: 'system',
                name: 'NDA / MNDA',
            },
        });
        (0, globals_1.expect)(response.data.documents.length).toBe(1);
        (0, globals_1.expect)(response.data.documents[0].variants).toContain('NDA');
        (0, globals_1.expect)(response.data.documents[0].variants).toContain('MNDA');
    });
    (0, globals_1.it)('fetches documents with category and subType filters', async () => {
        const response = await testClient.query({
            query: `
        query Documents($tenantId: String!, $category: String, $subType: String) {
          documents(tenantId: $tenantId, category: $category, subType: $subType) {
            id
          }
        }
      `,
            variables: {
                tenantId: 'system',
                category: 'Legal',
                subType: 'NDA',
            },
        });
        (0, globals_1.expect)(response.data.documents.length).toBe(1);
    });
    (0, globals_1.it)('fetches document relationships', async () => {
        // Find a document that should have relationships
        const msaResponse = await testClient.query({
            query: `
          query Documents($tenantId: String!, $name: String) {
            documents(tenantId: $tenantId, name: $name) {
              id
            }
          }
        `,
            variables: {
                tenantId: 'system',
                name: 'MSA / SOW',
            },
        });
        const msaId = msaResponse.data.documents[0].id;
        const response = await testClient.query({
            query: `
        query Document($id: ID!, $tenantId: String!) {
          document(id: $id, tenantId: $tenantId) {
            relationships {
              type
              document {
                subType
              }
            }
          }
        }
      `,
            variables: {
                id: msaId,
                tenantId: 'system',
            },
        });
        (0, globals_1.expect)(response.data.document.relationships.length).toBeGreaterThan(0);
        (0, globals_1.expect)(response.data.document.relationships[0].type).toBe('GOVERNING_AGREEMENT');
        (0, globals_1.expect)(response.data.document.relationships[0].document.subType).toBe('SOW');
    });
});
