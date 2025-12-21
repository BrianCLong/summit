const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const { Flags } = require('../../../../libs/ops/src/flags.js');
const { metricsMiddleware } = require('../../../../libs/ops/src/observe.js');

const port = Number(process.env.PORT || 7016);
if (!Flags.cases && !Flags.reports) {
  process.exit(0);
}

const app = express();
app.use(bodyParser.json());
app.use(metricsMiddleware('case-report'));

app.get('/healthz', (_req, res) => res.json({ ok: true, service: 'case-report' }));

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
    console.log(`case-report up on ${port}`);
  });
})();
