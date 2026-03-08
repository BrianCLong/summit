"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = require("body-parser");
const entities_js_1 = __importDefault(require("./routes/entities.js"));
const relationships_js_1 = __importDefault(require("./routes/relationships.js"));
const er_js_1 = __importDefault(require("./routes/er.js"));
const query_js_1 = __importDefault(require("./routes/query.js"));
const correlationId_js_1 = require("./middleware/correlationId.js");
const index_js_1 = require("./graphql/index.js");
const app = (0, express_1.default)();
app.use((0, body_parser_1.json)());
app.use(correlationId_js_1.correlationId);
// REST API routes (v1)
app.use('/api/v1/entities', entities_js_1.default);
app.use('/api/v1/relationships', relationships_js_1.default);
app.use('/api/v1/er', er_js_1.default);
app.use('/api/v1/query', query_js_1.default);
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/detailed', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'graph-core',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            rest: '/api/v1/*',
            graphql: '/graphql',
        },
    });
});
// Initialize GraphQL (async)
let graphqlReady = false;
async function initializeGraphQL() {
    try {
        await (0, index_js_1.setupGraphQL)(app);
        graphqlReady = true;
    }
    catch (error) {
        console.error('Failed to initialize GraphQL:', error);
        // Continue running with REST API only
    }
}
// Ready check (waits for GraphQL)
app.get('/health/ready', (_req, res) => {
    if (graphqlReady) {
        res.json({ status: 'ready', graphql: true });
    }
    else {
        res.status(503).json({ status: 'not_ready', graphql: false });
    }
});
const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
    // Initialize GraphQL first, then start server
    initializeGraphQL().then(() => {
        app.listen(port, () => {
            console.log(`graph-core listening on ${port}`);
            console.log(`  REST API: http://localhost:${port}/api/v1/`);
            console.log(`  GraphQL:  http://localhost:${port}/graphql`);
        });
    });
}
else {
    // For tests, initialize GraphQL synchronously-ish
    initializeGraphQL();
}
exports.default = app;
