import { createTestClient } from 'apollo-server-testing';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from '../../src/graphql/schema-combined';
import { resolvers } from '../../src/graphql/resolvers-combined';
import { neo } from '../../src/db/neo4j';
import { parseTaxonomy, ingestTaxonomy } from '../../../scripts/ingest-taxonomy.js';

describe('GraphQL Document API', () => {
  let server;
  let testClient;
  let createdDocId;

  beforeAll(async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ user: { tenantId: 'test-tenant' } }),
    });
    testClient = createTestClient(server);

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

  afterAll(async () => {
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

    const response1 = await testClient.mutate({ mutation: createMutation, variables: variables1 });
    const response2 = await testClient.mutate({ mutation: createMutation, variables: variables2 });

    expect(response1.data.createDocument.id).toBe(response2.data.createDocument.id);
    expect(response2.data.createDocument.entity.props.custom).toBe('value2');

    const countResponse = await neo.run(
      'MATCH (d:Document {name: "My Test NDA", tenantId: "test-tenant"}) RETURN count(d) as count'
    );
    expect(countResponse.records[0].get('count').low).toBe(1);
  });

  it('fetches a single document by ID', async () => {
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

    expect(response.data.document.id).toBe(createdDocId);
    expect(response.data.document.category).toBe('Finance');
    expect(response.data.document.subType).toBe('My Test Invoice');
  });

  it('returns null for a non-existent document', async () => {
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

    expect(response.data.document).toBeNull();
  });

  it('fetches documents with name filter', async () => {
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

    expect(response.data.documents.length).toBe(1);
    expect(response.data.documents[0].variants).toContain('NDA');
    expect(response.data.documents[0].variants).toContain('MNDA');
  });

  it('fetches documents with category and subType filters', async () => {
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

    expect(response.data.documents.length).toBe(1);
  });

  it('fetches document relationships', async () => {
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

    expect(response.data.document.relationships.length).toBeGreaterThan(0);
    expect(response.data.document.relationships[0].type).toBe('GOVERNING_AGREEMENT');
    expect(response.data.document.relationships[0].document.subType).toBe('SOW');
  });
});
