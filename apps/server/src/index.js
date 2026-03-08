"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = __importDefault(require("connect-redis"));
const ioredis_1 = __importDefault(require("ioredis"));
const fs_1 = require("fs");
const rateLimit_js_1 = require("./config/rateLimit.js");
const security_js_1 = require("./config/security.js");
const drop_js_1 = require("./graphql/resolvers/drop.js");
const scoreboard_js_1 = require("./graphql/resolvers/scoreboard.js");
const vault_js_1 = require("./security/vault.js");
const securityLogger_js_1 = require("./observability/securityLogger.js");
const typeDefs = [
    (0, fs_1.readFileSync)(new URL('./graphql/schemas/drop.graphql', import.meta.url), 'utf8'),
    (0, fs_1.readFileSync)(new URL('./graphql/schemas/scoreboard.graphql', import.meta.url), 'utf8'),
];
const server = new server_1.ApolloServer({
    typeDefs,
    resolvers: {
        Query: {
            ...drop_js_1.dropResolvers.Query,
            ...scoreboard_js_1.scoreboardResolvers.Query,
        },
        Mutation: {
            ...drop_js_1.dropResolvers.Mutation,
            ...scoreboard_js_1.scoreboardResolvers.Mutation,
        },
        DomainScoreboard: scoreboard_js_1.scoreboardResolvers.DomainScoreboard,
        DomainMetrics: scoreboard_js_1.scoreboardResolvers.DomainMetrics,
    },
});
const startServer = async () => {
    await server.start();
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use((0, cors_1.default)({
        origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
            .split(',')
            .map((o) => o.trim()),
        credentials: true,
    }));
    app.use((0, security_js_1.securityHeaders)());
    app.use(security_js_1.extraSecurityHeaders);
    app.use((0, rateLimit_js_1.createRateLimiter)());
    app.use(body_parser_1.default.json({ limit: '2mb' }));
    app.use(body_parser_1.default.urlencoded({ extended: true, limit: '2mb' }));
    const redisUrl = process.env.REDIS_URL;
    const redisClient = redisUrl ? new ioredis_1.default(redisUrl, { enableReadyCheck: false }) : undefined;
    const RedisStore = (0, connect_redis_1.default)(express_session_1.default);
    const sessionSecret = (await (0, vault_js_1.fetchSecret)('session_secret', process.env.SESSION_SECRET || '')) || 'change-me';
    if (sessionSecret === 'change-me') {
        securityLogger_js_1.securityLogger.logEvent('session_warning', {
            level: 'warn',
            message: 'Session secret fallback in use. Configure Vault or SESSION_SECRET.',
        });
    }
    app.use((0, express_session_1.default)({
        store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60, // 1 hour
        },
        name: process.env.SESSION_COOKIE_NAME || 'drop.sid',
    }));
    app.use('/healthz', (_req, res) => res.json({ status: 'ok' }));
    app.use('/graphql', (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => ({
            ip: req.ip,
            sessionId: req.sessionID,
        }),
    }));
    const port = Number(process.env.PORT) || 4001;
    app.listen(port, () => {
        console.log(`🚀 Drop Gateway ready at http://localhost:${port}/graphql`);
    });
};
startServer().catch((error) => {
    console.error('Failed to start Drop Gateway server', error);
});
