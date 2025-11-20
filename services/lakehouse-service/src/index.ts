/**
 * Lakehouse Service
 * REST API for lakehouse data operations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { LakehouseManager, TableFormat, TableConfig } from '@summit/lakehouse';
import { UnifiedAnalyticsEngine } from '@summit/unified-analytics';
import { GovernanceManager } from '@summit/cloud-governance';

const logger = pino({ name: 'lakehouse-service' });
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Initialize managers
const lakehouseManager = new LakehouseManager();
const analyticsEngine = new UnifiedAnalyticsEngine({
  enableAdaptiveExecution: true,
  enableCaching: true,
  maxConcurrency: 10,
  queryTimeout: 300000
});
const governanceManager = new GovernanceManager();

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lakehouse' });
});

// Create table
app.post('/api/tables', async (req, res) => {
  try {
    const config: TableConfig = req.body;
    const table = await lakehouseManager.createTable(config);
    res.status(201).json({
      message: 'Table created successfully',
      table: table.getMetadata()
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create table');
    res.status(500).json({ error: error.message });
  }
});

// List tables
app.get('/api/tables', async (req, res) => {
  try {
    const tables = await lakehouseManager.listTables();
    res.json({ tables });
  } catch (error: any) {
    logger.error({ error }, 'Failed to list tables');
    res.status(500).json({ error: error.message });
  }
});

// Get table metadata
app.get('/api/tables/:name', async (req, res) => {
  try {
    const metadata = await lakehouseManager.getTableMetadata(req.params.name);
    res.json({ metadata });
  } catch (error: any) {
    logger.error({ error, table: req.params.name }, 'Failed to get table metadata');
    res.status(404).json({ error: error.message });
  }
});

// Execute query
app.post('/api/query', async (req, res) => {
  try {
    const { query, principal } = req.body;

    // Check access
    const hasAccess = await governanceManager.checkAccess(principal, '*', 'read');
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await analyticsEngine.executeSQL(query);
    res.json({ result });
  } catch (error: any) {
    logger.error({ error }, 'Query execution failed');
    res.status(500).json({ error: error.message });
  }
});

// Get table snapshots
app.get('/api/tables/:name/snapshots', async (req, res) => {
  try {
    const table = lakehouseManager.getTable(req.params.name);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const snapshots = await table.listSnapshots();
    res.json({ snapshots });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get snapshots');
    res.status(500).json({ error: error.message });
  }
});

// Time travel query
app.post('/api/tables/:name/time-travel', async (req, res) => {
  try {
    const table = lakehouseManager.getTable(req.params.name);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const { version, timestamp, snapshotId } = req.body;
    const data = await table.readAtVersion({ version, timestamp, snapshotId });
    res.json({ data });
  } catch (error: any) {
    logger.error({ error }, 'Time travel query failed');
    res.status(500).json({ error: error.message });
  }
});

// Optimize table
app.post('/api/tables/:name/optimize', async (req, res) => {
  try {
    const table = lakehouseManager.getTable(req.params.name);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const result = await table.optimize();
    res.json({ result });
  } catch (error: any) {
    logger.error({ error }, 'Optimization failed');
    res.status(500).json({ error: error.message });
  }
});

// Governance endpoints
app.post('/api/governance/policies', async (req, res) => {
  try {
    const policy = await governanceManager.createPolicy(req.body);
    res.status(201).json({ policy });
  } catch (error: any) {
    logger.error({ error }, 'Failed to create policy');
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/governance/audit-logs', async (req, res) => {
  try {
    const logs = await governanceManager.getAuditLogs(req.query as any);
    res.json({ logs });
  } catch (error: any) {
    logger.error({ error }, 'Failed to get audit logs');
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Lakehouse service started');
});

export default app;
