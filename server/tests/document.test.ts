import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ApolloServer } from '@apollo/server';
let typeDefs: any;
let resolvers: any;
let neo: any;
let parseTaxonomy: () => unknown;
let ingestTaxonomy: (taxonomy: unknown) => Promise<void>;

const run = process.env.RUN_DOCUMENT_TESTS === 'true';
const describeIf = run ? describe : describe.skip;

describeIf('GraphQL Document API', () => {
  let server: ApolloServer;
  let execute: (query: string, variables?: Record<string, unknown>) => Promise<any>;
  let createdDocId: string;

  beforeAll(async () => {
    if (!run) return;
    ({ typeDefs } = await import('../../src/graphql/schema-combined.js'));
    ({ resolvers } = await import('../../src/graphql/resolvers-combined.js'));
    ({ neo } = await import('../../src/db/neo4j.js'));
    ({ parseTaxonomy, ingestTaxonomy } = await import('../../../scripts/ingest-taxonomy.js'));

    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ user: { tenantId: 'test-tenant' } }),
    });
    await server.start();
    execute = async (query, variables) => {
      const response = await server.executeOperation({
        query,
        variables,
      });
      if (response?.body?.kind === 'single') {
        return response.body.singleResult;
      }
      return response;
    };

    // Run the ingestion script to populate the database with the taxonomy
    const taxonomy = parseTaxonomy();
    await ingestTaxonomy(taxonomy);

    // Create a document to be used in tests
    const response = await execute(
      `
        mutation CreateDocument($input: DocumentInput!) {
          createDocument(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          tenantId: 'test-tenant',
          name: 'My Test Invoice',
          category: 'Finance',
        },
      },
    );
    createdDocId = response.data.createDocument.id;
  });

  afterAll(async () => {
    if (!run) return;
    await neo.run('MATCH (d:Document) DETACH DELETE d');
    await neo.run('MATCH (c:DocumentCategory) DETACH DELETE c');
  });

  it('creates a document idempotently and updates properties on match', async () => {
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

    const response1 = await execute(createMutation, variables1);
    const response2 = await execute(createMutation, variables2);

    expect(response1.data.createDocument.id).toBe(response2.data.createDocument.id);
    expect(response2.data.createDocument.entity.props.custom).toBe('value2');

    const countResponse = await neo.run(
      'MATCH (d:Document {name: "My Test NDA", tenantId: "test-tenant"}) RETURN count(d) as count'
    );
    expect(countResponse.records[0].get('count').low).toBe(1);
  });

  it('fetches a single document by ID', async () => {
    const response = await execute(
      `
        query Document($id: ID!, $tenantId: String!) {
          document(id: $id, tenantId: $tenantId) {
            id
            category
            subType
          }
        }
      `,
      {
        id: createdDocId,
        tenantId: 'test-tenant',
      },
    );

    expect(response.data.document.id).toBe(createdDocId);
    expect(response.data.document.category).toBe('Finance');
    expect(response.data.document.subType).toBe('My Test Invoice');
  });

  it('returns null for a non-existent document', async () => {
    const response = await execute(
      `
        query Document($id: ID!, $tenantId: String!) {
          document(id: $id, tenantId: $tenantId) {
            id
          }
        }
      `,
      {
        id: 'non-existent-id',
        tenantId: 'test-tenant',
      },
    );

    expect(response.data.document).toBeNull();
  });

  it('fetches documents with name filter', async () => {
    const response = await execute(
      `
        query Documents($tenantId: String!, $name: String) {
          documents(tenantId: $tenantId, name: $name) {
            id
            category
            subType
            variants
          }
        }
      `,
      {
        tenantId: 'system',
        name: 'NDA / MNDA',
      },
    );

    expect(response.data.documents.length).toBe(1);
    expect(response.data.documents[0].variants).toContain('NDA');
    expect(response.data.documents[0].variants).toContain('MNDA');
  });

  it('fetches documents with category and subType filters', async () => {
    const response = await execute(
      `
        query Documents($tenantId: String!, $category: String, $subType: String) {
          documents(tenantId: $tenantId, category: $category, subType: $subType) {
            id
          }
        }
      `,
      {
        tenantId: 'system',
        category: 'Legal',
        subType: 'NDA',
      },
    );

    expect(response.data.documents.length).toBe(1);
  });

  it('fetches document relationships', async () => {
    // Find a document that should have relationships
    const msaResponse = await execute(
      `
          query Documents($tenantId: String!, $name: String) {
            documents(tenantId: $tenantId, name: $name) {
              id
            }
          }
        `,
      {
        tenantId: 'system',
        name: 'MSA / SOW',
      },
    );
    const msaId = msaResponse.data.documents[0].id;

    const response = await execute(
      `
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
      {
        id: msaId,
        tenantId: 'system',
      },
    );

    expect(response.data.document.relationships.length).toBeGreaterThan(0);
    expect(response.data.document.relationships[0].type).toBe('GOVERNING_AGREEMENT');
    expect(response.data.document.relationships[0].document.subType).toBe('SOW');
  });
});
