import express from 'express';
import { createServer } from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import { readFileSync } from 'fs';
import { join } from 'path';

import { resolvers } from './graphql/resolvers';
import { config } from '../config';
import { logger } from '../observability/logging';
import { initSocket } from './realtime/socket';

const typeDefs = readFileSync(join(__dirname, 'graphql/schema.graphql'), 'utf8');
const schema = makeExecutableSchema({ typeDefs, resolvers });

export const startServer = async () => {
  const app = express();
  const httpServer = createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use('/graphql', cors<cors.CorsRequest>(), bodyParser.json(), expressMiddleware(server));

  initSocket(httpServer);

  httpServer.listen(config.port, () => {
    logger.info(`🚀 Server ready at http://localhost:${config.port}/graphql`);
  });
};
