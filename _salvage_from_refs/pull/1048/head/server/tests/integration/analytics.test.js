const request = require('supertest');
const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const typeDefs = require('../../src/graphql/schema').typeDefs;
const resolvers = require('../../src/graphql/resolvers').default; // Note: .default for default export
const analyticsService = require('../../src/services/analyticsService');

// Mock the analytics service to prevent actual HTTP calls during testing
jest.mock('../../src/services/analyticsService', () => ({
  runCommunityDetection: jest.fn(() => Promise.resolve({
    message: 'Mocked community detection completed.',
    communitiesDetected: 5,
    nodesUpdated: 100,
  })),
}));

describe('Analytics GraphQL Integration', () => {
  let server;
  let app;

  beforeAll(async () => {
    app = express();
    server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    server.applyMiddleware({ app });
  });

  afterAll(async () => {
    await server.stop();
    jest.clearAllMocks();
  });

  it('should trigger community detection via GraphQL mutation', async () => {
    const query = `
      mutation {
        runCommunityDetection {
          message
          communitiesDetected
          nodesUpdated
        }
      }
    `;

    const res = await request(app)
      .post(server.graphqlPath)
      .send({ query })
      .expect(200);

    expect(res.body.data.runCommunityDetection).toBeDefined();
    expect(res.body.data.runCommunityDetection.message).toBe('Mocked community detection completed.');
    expect(res.body.data.runCommunityDetection.communitiesDetected).toBe(5);
    expect(res.body.data.runCommunityDetection.nodesUpdated).toBe(100);

    // Verify that the analytics service's function was called
    expect(analyticsService.runCommunityDetection).toHaveBeenCalledTimes(1);
  });
});
