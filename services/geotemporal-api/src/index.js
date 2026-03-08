"use strict";
/**
 * Geo-Temporal Analytics API Service
 *
 * Provides HTTP REST APIs for trajectory analysis, stay-point detection,
 * co-presence detection, and convoy detection.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const geospatial_1 = require("@intelgraph/geospatial");
const geotemporal_js_1 = __importDefault(require("./routes/geotemporal.js"));
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 4100;
// Environment configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';
// Middleware
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'geotemporal-api',
        timestamp: new Date().toISOString(),
    });
});
// Initialize Neo4j connection
const driver = neo4j_driver_1.default.driver(NEO4J_URI, neo4j_driver_1.default.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 60000, // 1 minute
});
// Initialize repository and service
const repository = new geospatial_1.Neo4jGeoGraphRepository(driver, NEO4J_DATABASE);
const geoTemporalService = new geospatial_1.GeoTemporalService(repository);
// Mount routes with service dependency injection
app.use('/api/geotemporal', (0, geotemporal_js_1.default)(geoTemporalService));
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing connections...');
    await driver.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, closing connections...');
    await driver.close();
    process.exit(0);
});
// Start server
const startServer = async () => {
    try {
        // Verify Neo4j connectivity
        await driver.verifyConnectivity();
        console.log('Connected to Neo4j:', NEO4J_URI);
        app.listen(PORT, () => {
            console.log(`Geo-Temporal API listening on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`API base: http://localhost:${PORT}/api/geotemporal`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
