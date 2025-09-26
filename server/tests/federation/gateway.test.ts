import { gql } from 'graphql-tag';

import { createFederatedApolloServer } from '../../graphql/federation/index.js';

describe('Apollo Federation gateway', () => {
  const apolloServer = createFederatedApolloServer({ useLocalServices: true });

  beforeAll(async () => {
    await apolloServer.server.start();
  });

  afterAll(async () => {
    await apolloServer.server.stop();
  });

  it('stitches entity data with ML jobs and ingest events', async () => {
    const query = gql`
      query EntityWithFederatedFields($id: ID!) {
        entity(id: $id) {
          id
          name
          type
          attributes
          mlJobs {
            id
            status
          }
          latestMlJob {
            id
            status
          }
          ingestEvents {
            id
            status
            source
          }
          latestIngestEvent {
            id
            status
          }
        }
      }
    `;

    const response = await apolloServer.server.executeOperation({
      query,
      variables: { id: 'entity-1' },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data?.entity).toMatchObject({
      id: 'entity-1',
      mlJobs: expect.arrayContaining([
        expect.objectContaining({ id: 'ml-1', status: 'COMPLETED' }),
      ]),
      ingestEvents: expect.arrayContaining([
        expect.objectContaining({ id: 'ingest-1', status: 'COMPLETE' }),
      ]),
    });
  });

  it('filters ingest events across the federated schema', async () => {
    const query = gql`
      query EntityWithFilteredEvents($id: ID!, $status: String!) {
        entity(id: $id) {
          id
          ingestEvents(status: $status) {
            id
            status
          }
        }
      }
    `;

    const response = await apolloServer.server.executeOperation({
      query,
      variables: { id: 'entity-1', status: 'COMPLETE' },
    });

    expect(response.errors).toBeUndefined();
    expect(response.data?.entity.ingestEvents).toHaveLength(1);
    expect(response.data?.entity.ingestEvents[0]).toMatchObject({ id: 'ingest-1', status: 'COMPLETE' });
  });
});
