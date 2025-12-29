import { ApolloServer } from 'apollo-server';
import http from 'http';
import { resolvers, typeDefs } from './schema';

const server = new ApolloServer({ typeDefs, resolvers });
server
  .listen({ port: 4010 })
  .then(({ url }) => console.log(`[prov-ledger] listening at ${url}`))
  .catch((err) => {
    console.error('Failed to start prov-ledger', err);
    process.exit(1);
  });

http
  .createServer((_, res) => {
    res.writeHead(200);
    res.end('ok');
  })
  .listen(4011, () => console.log('[prov-ledger] health server on 4011'));
