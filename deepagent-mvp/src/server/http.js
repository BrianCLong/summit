"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const drainHttpServer_1 = require("@apollo/server/plugin/drainHttpServer");
const schema_1 = require("@graphql-tools/schema");
const ws_1 = require("ws");
const ws_2 = require("graphql-ws/lib/use/ws");
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const fs_1 = require("fs");
const path_1 = require("path");
const resolvers_1 = require("./graphql/resolvers");
const config_1 = require("../config");
const logging_1 = require("../observability/logging");
const socket_1 = require("./realtime/socket");
const auth_1 = require("./auth");
const typeDefs = (0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'graphql/schema.graphql'), 'utf8');
const schema = (0, schema_1.makeExecutableSchema)({ typeDefs, resolvers: resolvers_1.resolvers });
const startServer = async () => {
    const app = (0, express_1.default)();
    const httpServer = (0, http_1.createServer)(app);
    const wsServer = new ws_1.WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });
    const serverCleanup = (0, ws_2.useServer)({ schema }, wsServer);
    const server = new server_1.ApolloServer({
        schema,
        plugins: [
            (0, drainHttpServer_1.ApolloServerPluginDrainHttpServer)({ httpServer }),
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
    app.use('/graphql', (0, cors_1.default)(), body_parser_1.default.json(), (0, express4_1.expressMiddleware)(server, {
        context: auth_1.getContext,
    }));
    (0, socket_1.initSocket)(httpServer);
    httpServer.listen(config_1.config.port, () => {
        logging_1.logger.info(`🚀 Server ready at http://localhost:${config_1.config.port}/graphql`);
    });
};
exports.startServer = startServer;
