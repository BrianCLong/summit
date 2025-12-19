import express from "express";
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { security } from "./security";
import { policyGuard } from "./middleware/policyGuard";
import { eventsSseHandler } from "./rest/events_sse";
import { resolvers } from "./graphql/subscriptions";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(security);
app.use(policyGuard);
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "gateway" }));
app.get("/v1/events/stream", eventsSseHandler);

const httpServer = createServer(app);

// GraphQL Schema setup
try {
    const typeDefs = readFileSync(join(__dirname, '../graphql/subscriptions.graphql'), 'utf8');
    const schema = makeExecutableSchema({ typeDefs, resolvers });

    // WS Server
    const wsServer = new WebSocketServer({
        server: httpServer,
        path: '/graphql',
    });

    useServer({
        schema,
        context: async (ctx, msg, args) => {
             // Extract user from token and return in context
             // In real impl, verify ctx.connectionParams.Authorization
             return { user: { tenant: 't1' } }; // Mock for MVP
        }
    }, wsServer);
} catch (e) {
    console.warn("Could not setup GraphQL Subscriptions (missing schema or deps):", e);
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(`Gateway listening on port ${PORT}`);
});

export default app;
