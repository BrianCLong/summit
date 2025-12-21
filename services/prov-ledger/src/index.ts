import { ApolloServer } from 'apollo-server';
import { typeDefs, resolvers } from './schema';

const server = new ApolloServer({ typeDefs, resolvers });
server.listen({ port: 4010 }).then(({ url }) => console.log(`[prov-ledger] listening at ${url}`));
// express health shim for k6/dev tools
import http from 'http';
http.createServer((_, res) => { res.writeHead(200); res.end('ok'); }).listen(4011);
