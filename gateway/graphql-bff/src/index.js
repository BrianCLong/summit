"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.server = void 0;
exports.start = start;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const server_1 = require("@apollo/server");
const express4_1 = require("@apollo/server/express4");
const gateway_1 = require("@apollo/gateway");
const http_1 = require("http");
// @ts-ignore - no types available
const graphql_depth_limit_1 = __importDefault(require("graphql-depth-limit"));
// @ts-ignore - no types available
const graphql_validation_complexity_1 = require("graphql-validation-complexity");
const yaml_1 = __importDefault(require("yaml"));
const api_1 = require("@opentelemetry/api");
const PORT = process.env.PORT || 4000;
const PERSISTED_ONLY = process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PERSISTED === 'true'
    ? false
    : process.env.NODE_ENV === 'production';
const subgraphConfig = yaml_1.default.parse((0, fs_1.readFileSync)(path_1.default.join(process.cwd(), 'subgraphs.yaml')).toString());
class HeaderForwardingDataSource extends gateway_1.RemoteGraphQLDataSource {
    willSendRequest({ request, context }) {
        const headers = context?.headers;
        const forwardHeaders = [
            'x-request-id',
            'x-tenant-id',
            'x-authority-id',
            'traceparent',
        ];
        forwardHeaders.forEach((h) => {
            const value = headers?.[h];
            if (value) {
                request.http?.headers.set(h, Array.isArray(value) ? value[0] : value);
            }
        });
    }
}
const gateway = new gateway_1.ApolloGateway({
    serviceList: Object.entries(subgraphConfig.subgraphs).map(([name, { url }]) => ({
        name,
        url,
    })),
    buildService({ url }) {
        return new HeaderForwardingDataSource({ url });
    },
});
exports.server = new server_1.ApolloServer({
    gateway,
    validationRules: [
        (0, graphql_depth_limit_1.default)(10),
        (0, graphql_validation_complexity_1.createComplexityLimitRule)(1000, {
            createError: (type) => new Error(`Query is too complex: ${type}`),
        }),
    ],
});
exports.app = (0, express_1.default)();
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: (req) => (req.headers['x-tenant-id'] ? 100 : 50),
    keyGenerator: (req) => String(req.headers['x-tenant-id'] || req.ip),
});
exports.app.use(limiter);
const persistedQueries = new Map();
exports.app.get('/health/federation', async (_req, res) => {
    const results = {};
    await Promise.all(gateway.serviceList.map(async (s) => {
        try {
            const r = await fetch(`${s.url.replace(/\/graphql$/, '')}/health`);
            results[s.name] = r.ok;
        }
        catch {
            results[s.name] = false;
        }
    }));
    res.json(results);
});
let started = false;
async function start() {
    if (started)
        return;
    await exports.server.start();
    exports.app.use('/graphql', async (req, res, next) => {
        await express_1.default.json()(req, res, () => { });
        const hash = req.body?.extensions?.persistedQuery?.sha256Hash;
        const query = req.body?.query;
        if (hash && query) {
            persistedQueries.set(hash, query);
        }
        else if (hash && persistedQueries.has(hash)) {
            req.body.query = persistedQueries.get(hash);
        }
        else if (PERSISTED_ONLY) {
            res.status(400).json({ error: 'Persisted query required' });
            return;
        }
        const span = api_1.trace.getTracer('gateway').startSpan('request');
        res.on('finish', () => span.end());
        next();
    }, (0, express4_1.expressMiddleware)(exports.server, {
        context: async ({ req }) => ({ headers: req.headers }),
    }));
    const httpServer = (0, http_1.createServer)(exports.app);
    await new Promise((resolve) => {
        httpServer.listen(PORT, () => {
            console.log(`Gateway ready at http://localhost:${PORT}/graphql`);
            resolve();
        });
    });
    started = true;
}
if (process.env.NODE_ENV !== 'test') {
    start();
}
