// @ts-nocheck
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs, resolvers } from './schema';
import http from 'http';

const server = new ApolloServer({ typeDefs, resolvers });

async function main() {
  const { url } = await startStandaloneServer(server, { listen: { port: 4010 } });
  console.log(`[prov-ledger] listening at ${url}`);
}

main().catch((error) => {
  console.error('[prov-ledger] startup failed', error);
  process.exit(1);
});

// express health shim for k6/dev tools
http.createServer((_, res) => { res.writeHead(200); res.end('ok'); }).listen(4011);
