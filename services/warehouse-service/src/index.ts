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

import express from 'express';
import { Pool } from 'pg';
import { WarehouseManager } from '@intelgraph/data-warehouse';
import { ModelingManager } from '@intelgraph/dimensional-modeling';
import { CubeManager } from '@intelgraph/olap-engine';

// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 16): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'localhost'];
  if (insecureValues.includes(value.toLowerCase())) {
    console.error(`FATAL: ${name} is set to an insecure default value: "${value}"`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

const app = express();
app.use(express.json());

// Initialize database pools
const mainPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'warehouse',
  user: process.env.POSTGRES_USER || 'postgres',
  password: requireSecret('POSTGRES_PASSWORD', process.env.POSTGRES_PASSWORD),
  max: 100,
});

// Initialize managers
const warehouse = new WarehouseManager({ pools: [mainPool] });
const modeling = new ModelingManager(mainPool);
const olap = new CubeManager(mainPool);

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
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create table
app.post('/api/v1/tables', async (req, res) => {
  try {
    const schema = req.body;
    await warehouse.createTable(schema);
    res.json({ message: 'Table created successfully', table: schema.name });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Load data
app.post('/api/v1/tables/:table/data', async (req, res) => {
  try {
    const { table } = req.params;
    const { columns, data } = req.body;
    await warehouse.insertData(table, columns, data);
    res.json({ message: 'Data loaded successfully', rowsLoaded: data.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// OLAP cube operations
app.post('/api/v1/cubes', async (req, res) => {
  try {
    const definition = req.body;
    await olap.createCube(definition);
    res.json({ message: 'Cube created successfully', cube: definition.name });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/v1/cubes/:cube/query', async (req, res) => {
  try {
    const { cube } = req.params;
    const { dimensions, measures, filters } = req.body;
    const results = await olap.queryCube(cube, dimensions, measures, filters);
    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Dimensional modeling
app.post('/api/v1/dimensions', async (req, res) => {
  try {
    const { name, attributes } = req.body;
    await modeling.dimensionManager.createDimension(name, attributes);
    res.json({ message: 'Dimension created successfully', dimension: name });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Statistics and monitoring
app.get('/api/v1/tables/:table/stats', async (req, res) => {
  try {
    const { table } = req.params;
    const stats = await warehouse.getStorageStats(table);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/v1/cache/stats', async (req, res) => {
  try {
    const stats = warehouse.getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Warehouse service listening on port ${PORT}`);
});

export default app;
