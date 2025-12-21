import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import { Flags } from '../../../../libs/ops/src/flags';
import { httpReqDur } from '../../../../libs/ops/src/observe';

const port = Number(process.env.PORT || 7012);

if (!Flags.lac) {
  process.exit(0);
}

const app = express();
app.use(bodyParser.json());
app.use((req, res, next) => {
  const end = httpReqDur.startTimer({ service: 'lac-compiler', route: req.path, method: req.method });
  res.on('finish', () => end());
  next();
});

app.post('/lac/compile', (_req, res) => res.status(201).json({ wasm: 'placeholder', ok: true }));
app.get('/lac/simulate', (_req, res) => res.json({ ok: true, decision: 'allow' }));

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
    console.log(`lac-compiler up on ${port}`);
  });
}

start();
