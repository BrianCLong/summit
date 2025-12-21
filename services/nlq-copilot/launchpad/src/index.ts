import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import { Flags } from '../../../../libs/ops/src/flags';
import { httpReqDur } from '../../../../libs/ops/src/observe';

const port = Number(process.env.PORT || 7013);

if (!Flags.nlq) {
  process.exit(0);
}

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  const end = httpReqDur.startTimer({ service: 'nlq-copilot', route: req.path, method: req.method });
  res.on('finish', () => end());
  next();
});

app.post('/plan', (_req, res) => res.json({ plan: ['MATCH (n) RETURN n'], sandbox: true }));
app.post('/execute', (req, res) => res.json({ executed: true, sandbox: req.query.sandbox === 'true', request: req.body }));

const typeDefs = /* GraphQL */ `
  type Query { ping: String! }
`;
const resolvers = { Query: { ping: () => 'pong' } };

async function start() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use('/graphql', expressMiddleware(server));
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`nlq-copilot up on ${port}`);
  });
}

start();
