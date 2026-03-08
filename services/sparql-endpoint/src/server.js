"use strict";
/**
 * SPARQL Endpoint Server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const SPARQLQueryEngine_js_1 = require("./sparql/SPARQLQueryEngine.js");
const app = (0, express_1.default)();
const port = process.env.SPARQL_PORT || 3030;
// Initialize Neo4j driver
const driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'));
const queryEngine = new SPARQLQueryEngine_js_1.SPARQLQueryEngine(driver);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
/**
 * SPARQL Query endpoint (GET)
 */
app.get('/sparql', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.status(400).json({ error: 'Missing query parameter' });
        }
        const result = await queryEngine.executeQuery(query);
        res.json({
            head: { vars: result.variables },
            results: { bindings: result.bindings },
        });
    }
    catch (error) {
        console.error('SPARQL query error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * SPARQL Query endpoint (POST)
 */
app.post('/sparql', async (req, res) => {
    try {
        const query = req.body.query || req.body;
        if (!query) {
            return res.status(400).json({ error: 'Missing query in request body' });
        }
        const queryString = typeof query === 'string' ? query : query.toString();
        const result = await queryEngine.executeQuery(queryString);
        res.json({
            head: { vars: result.variables },
            results: { bindings: result.bindings },
        });
    }
    catch (error) {
        console.error('SPARQL query error:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
    try {
        await driver.verifyConnectivity();
        res.json({ status: 'healthy', service: 'sparql-endpoint' });
    }
    catch (error) {
        res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
    }
});
/**
 * Service info endpoint
 */
app.get('/', (req, res) => {
    res.json({
        service: 'IntelGraph SPARQL Endpoint',
        version: '1.0.0',
        endpoints: {
            query: '/sparql (GET, POST)',
            health: '/health',
        },
        documentation: '/docs',
    });
});
// Start server
app.listen(port, () => {
    console.log(`SPARQL endpoint listening on port ${port}`);
    console.log(`Query endpoint: http://localhost:${port}/sparql`);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await driver.close();
    process.exit(0);
});
exports.default = app;
