"use strict";
/**
 * Summit Data Warehouse Service
 *
 * REST API for data warehouse operations including:
 * - Table creation and management
 * - Data loading (bulk and incremental)
 * - Query execution
 * - OLAP cube operations
 * - Dimensional modeling
 * - Performance monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const data_warehouse_1 = require("@intelgraph/data-warehouse");
const dimensional_modeling_1 = require("@intelgraph/dimensional-modeling");
const olap_engine_1 = require("@intelgraph/olap-engine");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Initialize database pools
const mainPool = new pg_1.Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'warehouse',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    max: 100,
});
// Initialize managers
const warehouse = new data_warehouse_1.WarehouseManager({ pools: [mainPool] });
const modeling = new dimensional_modeling_1.ModelingManager(mainPool);
const olap = new olap_engine_1.CubeManager(mainPool);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'warehouse' });
});
// Query endpoint
app.post('/api/v1/query', async (req, res) => {
    try {
        const { sql, priority } = req.body;
        const results = await warehouse.query(sql, priority);
        res.json({ data: results, rowCount: results.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create table
app.post('/api/v1/tables', async (req, res) => {
    try {
        const schema = req.body;
        await warehouse.createTable(schema);
        res.json({ message: 'Table created successfully', table: schema.name });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Load data
app.post('/api/v1/tables/:table/data', async (req, res) => {
    try {
        const { table } = req.params;
        const { columns, data } = req.body;
        await warehouse.insertData(table, columns, data);
        res.json({ message: 'Data loaded successfully', rowsLoaded: data.length });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// OLAP cube operations
app.post('/api/v1/cubes', async (req, res) => {
    try {
        const definition = req.body;
        await olap.createCube(definition);
        res.json({ message: 'Cube created successfully', cube: definition.name });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/cubes/:cube/query', async (req, res) => {
    try {
        const { cube } = req.params;
        const { dimensions, measures, filters } = req.body;
        const results = await olap.queryCube(cube, dimensions, measures, filters);
        res.json({ data: results });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Dimensional modeling
app.post('/api/v1/dimensions', async (req, res) => {
    try {
        const { name, attributes } = req.body;
        await modeling.dimensionManager.createDimension(name, attributes);
        res.json({ message: 'Dimension created successfully', dimension: name });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Statistics and monitoring
app.get('/api/v1/tables/:table/stats', async (req, res) => {
    try {
        const { table } = req.params;
        const stats = await warehouse.getStorageStats(table);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/cache/stats', async (req, res) => {
    try {
        const stats = warehouse.getCacheStats();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Warehouse service listening on port ${PORT}`);
});
exports.default = app;
