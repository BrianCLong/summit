import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import { Flags } from '../../../../libs/ops/src/flags';
import { httpReqDur } from '../../../../libs/ops/src/observe';

const port = Number(process.env.PORT || 7019);

if (!Flags.fedPlan) {
  process.exit(0);
}

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  const end = httpReqDur.startTimer({ service: 'federation-planner', route: req.path, method: req.method });
  res.on('finish', () => end());
  next();
});

app.post('/federation/plan', (req, res) => res.json({ ok: true, plan: ['claim-A', 'claim-B'], request: req.body }));
app.get('/federation/claims', (_req, res) => res.json({ claims: [], proofs: [] }));

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
    console.log(`federation-planner up on ${port}`);
  });
}

start();
