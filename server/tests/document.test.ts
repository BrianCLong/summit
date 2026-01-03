import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../src/graphql/schema-combined';
import { resolvers } from '../../src/graphql/resolvers-combined';
import { neo } from '../../src/db/neo4j';
import { parseTaxonomy, ingestTaxonomy } from '../../../scripts/ingest-taxonomy.js';

// Helper to execute GraphQL operations against the test server
async function executeOperation(
  server: ApolloServer,
  operation: { query?: string; mutation?: string; variables?: Record<string, any> }
) {
  const { query, mutation, variables } = operation;
  return server.executeOperation({
    query: query || mutation || '',
    variables,
  }, {
    contextValue: { user: { tenantId: 'test-tenant' } },
  });
}

describe('GraphQL Document API', () => {
  let server: ApolloServer;
  let createdDocId: string;

  beforeAll(async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    // Run the ingestion script to populate the database with the taxonomy
    const taxonomy = parseTaxonomy();
    await ingestTaxonomy(taxonomy);

    // Create a document to be used in tests
    const response = await executeOperation(server, {
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
    createdDocId = response.body.kind === 'single' ? (response.body.singleResult.data as any).createDocument.id : '';
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

    const response1 = await executeOperation(server, { mutation: createMutation, variables: variables1 });
    const response2 = await executeOperation(server, { mutation: createMutation, variables: variables2 });

    const data1 = response1.body.kind === 'single' ? response1.body.singleResult.data as any : null;
    const data2 = response2.body.kind === 'single' ? response2.body.singleResult.data as any : null;

    expect(data1!.createDocument.id).toBe(data2!.createDocument.id);
    expect(data2!.createDocument.entity.props.custom).toBe('value2');

    const countResponse = await neo.run(
      'MATCH (d:Document {name: "My Test NDA", tenantId: "test-tenant"}) RETURN count(d) as count'
    );
    expect(countResponse.records[0].get('count').low).toBe(1);
  });

  it('fetches a single document by ID', async () => {
    const response = await executeOperation(server, {
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

    const data = response.body.kind === 'single' ? response.body.singleResult.data as any : null;
    expect(data!.document.id).toBe(createdDocId);
    expect(data!.document.category).toBe('Finance');
    expect(data!.document.subType).toBe('My Test Invoice');
  });

  it('returns null for a non-existent document', async () => {
    const response = await executeOperation(server, {
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

    const data = response.body.kind === 'single' ? response.body.singleResult.data as any : null;
    expect(data!.document).toBeNull();
  });

  it('fetches documents with name filter', async () => {
    const response = await executeOperation(server, {
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

    const data = response.body.kind === 'single' ? response.body.singleResult.data as any : null;
    expect(data!.documents.length).toBe(1);
    expect(data!.documents[0].variants).toContain('NDA');
    expect(data!.documents[0].variants).toContain('MNDA');
  });

  it('fetches documents with category and subType filters', async () => {
    const response = await executeOperation(server, {
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

    const data = response.body.kind === 'single' ? response.body.singleResult.data as any : null;
    expect(data!.documents.length).toBe(1);
  });

  it('fetches document relationships', async () => {
    // Find a document that should have relationships
    const msaResponse = await executeOperation(server, {
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
    const msaData = msaResponse.body.kind === 'single' ? msaResponse.body.singleResult.data as any : null;
    const msaId = msaData!.documents[0].id;

    const response = await executeOperation(server, {
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

    const data = response.body.kind === 'single' ? response.body.singleResult.data as any : null;
    expect(data!.document.relationships.length).toBeGreaterThan(0);
    expect(data!.document.relationships[0].type).toBe('GOVERNING_AGREEMENT');
    expect(data!.document.relationships[0].document.subType).toBe('SOW');
  });
});
