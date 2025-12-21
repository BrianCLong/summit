import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import { Flags } from '../../../../libs/ops/src/flags';
import { httpReqDur } from '../../../../libs/ops/src/observe';

const port = Number(process.env.PORT || 7014);

if (!Flags.ingest) {
  process.exit(0);
}

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  const end = httpReqDur.startTimer({ service: 'ingest-wizard', route: req.path, method: req.method });
  res.on('finish', () => end());
  next();
});

app.post('/ingest/wizard/preview', (req, res) => res.json({ ok: true, preview: req.body }));
app.post('/ingest/wizard/submit', (req, res) => res.status(202).json({ accepted: true, runId: 'ingest-run', body: req.body }));

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
    console.log(`ingest-wizard up on ${port}`);
  });
}

start();
