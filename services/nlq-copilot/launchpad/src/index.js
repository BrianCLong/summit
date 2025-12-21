const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const { Flags } = require('../../../../libs/ops/src/flags.js');
const { metricsMiddleware } = require('../../../../libs/ops/src/observe.js');

const port = Number(process.env.PORT || 7013);
if (!Flags.nlq) {
  process.exit(0);
}

const app = express();
app.use(bodyParser.json());
app.use(metricsMiddleware('nlq-copilot'));

app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'nlq-copilot' }));

const typeDefs = /* GraphQL */ `
  type Query { ping: String! }
`;
const resolvers = { Query: { ping: () => 'pong' } };

(async () => {
  const gql = new ApolloServer({ typeDefs, resolvers });
  await gql.start();
  app.use('/graphql', expressMiddleware(gql));
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`nlq-copilot up on ${port}`);
  });
})();
