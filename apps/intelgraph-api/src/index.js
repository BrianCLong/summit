"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pino_1 = __importDefault(require("pino"));
const server_1 = require("@apollo/server");
const express4_1 = require("@as-integrations/express4");
const schema_js_1 = require("./schema.js");
const context_js_1 = require("./lib/context.js");
const express_jwt_1 = require("express-jwt");
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const api_1 = require("@opentelemetry/api");
const internalStatus_js_1 = require("./routes/internalStatus.js");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const app = (0, express_1.default)();
// Custom pino serializer to inject traceId
const pinoLogger = (0, pino_1.default)({
    mixin() {
        const span = api_1.trace.getSpan(api_1.context.active());
        if (span) {
            const spanContext = span.spanContext();
            return { traceId: spanContext.traceId, spanId: spanContext.spanId };
        }
        return {};
    },
});
const logger = pinoLogger; // Use the custom pino logger
app.use((0, cors_1.default)());
app.get('/healthz', (_, res) => res.json({ ok: true }));
// JWT middleware for authentication
const jwksSecret = jwks_rsa_1.default.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI || 'http://localhost:8080/.well-known/jwks.json',
});
app.use((0, express_jwt_1.expressjwt)({
    secret: jwksSecret,
    algorithms: ['RS256'],
    credentialsRequired: false,
}).unless({
    path: ['/healthz', '/graphql'],
}));
// Error handling for JWT authentication
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        logger.warn({ err }, 'Unauthorized access attempt');
        return res.status(401).send('Invalid token');
    }
    next();
});
async function main() {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const server = new server_1.ApolloServer({
        typeDefs: schema_js_1.typeDefs,
        resolvers: schema_js_1.resolvers,
        formatError: (formattedError, error) => {
            logger.error(error, 'GraphQL Error');
            return formattedError;
        },
    });
    await server.start();
    app.use('/graphql', (0, cors_1.default)(), express_1.default.json(), 
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    (0, express4_1.expressMiddleware)(server, {
        context: async ({ req }) => (0, context_js_1.makeContext)(req, logger),
    }));
    (0, internalStatus_js_1.registerInternalStatusRoutes)(app);
    app.listen(PORT, () => logger.info({ PORT }, 'IntelGraph API listening'));
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
