import request from 'supertest';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { depthLimit } from '../src/graphql/validation/depthLimit';
import { complexityLimit } from '../src/graphql/validation/complexityLimit';
import { createApp } from '../src/app';

describe('GraphQL security defaults', () => {
  test('/health returns 200', async () => {
    process.env.NODE_ENV = 'production';
    const app = await createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('introspection disabled and depth limit enforced', async () => {
    const typeDefs = `type Query { a: Query }`;
    const resolvers = { Query: { a: () => ({}) } };
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const app = express();
    const server = new ApolloServer({
      schema,
      introspection: false,
      validationRules: [depthLimit(2), complexityLimit(5)],
    });
    await server.start();
    app.use('/graphql', express.json(), expressMiddleware(server));

    const introspection = await request(app)
      .post('/graphql')
      .send({ query: '{ __schema { types { name } } }' });
    expect(introspection.status).toBe(400);

    const deepQuery = '{ a { a { a { a } } } }';
    const res = await request(app).post('/graphql').send({ query: deepQuery });
    expect(res.status).toBe(400);
  });
});
