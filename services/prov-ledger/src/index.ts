import http from 'http';
import { ApolloServer } from 'apollo-server';
import { typeDefs, resolvers } from './schema';

const server = new ApolloServer({ typeDefs, resolvers });
server.listen({ port: 4010 }).then(({ url }) => console.log(`[prov-ledger] listening at ${url}`));

const healthServer = http.createServer((_, res) => {
  res.writeHead(200);
  res.end('ok');
});

healthServer.listen(4011, () => console.log('[prov-ledger] health listening on 4011'));
