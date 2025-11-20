/**
 * IntelGraph Time Series Service
 * REST API for time series data storage and querying
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Pool } from 'pg';
import { TimescaleStorage } from '@intelgraph/time-series';
import { StatisticalDetector } from '@intelgraph/anomaly-detection';

const app: Express = express();
const port = process.env.TS_SERVICE_PORT || 3010;

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'intelgraph',
  user: process.env.POSTGRES_USER || 'intelgraph',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 20
});

const storage = new TimescaleStorage(pool);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'time-series', timestamp: new Date() });
});

// Initialize storage
app.post('/api/v1/timeseries/initialize', async (req: Request, res: Response) => {
  try {
    await storage.initialize();
    res.json({ success: true, message: 'Time series storage initialized' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize storage', details: (error as Error).message });
  }
});

// Insert metrics
app.post('/api/v1/timeseries/metrics', async (req: Request, res: Response) => {
  try {
    const { metrics } = req.body;

    if (!Array.isArray(metrics)) {
      return res.status(400).json({ error: 'metrics must be an array' });
    }

    const parsedMetrics = metrics.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));

    await storage.insertMetrics(parsedMetrics);

    res.json({
      success: true,
      inserted: metrics.length,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to insert metrics', details: (error as Error).message });
  }
});

// Query metrics
app.post('/api/v1/timeseries/query', async (req: Request, res: Response) => {
  try {
    const { start_time, end_time, metric_name, entity_id, limit, offset } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time are required' });
    }

    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name,
      entity_id,
      limit,
      offset
    };

    const results = await storage.query(query);

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to query metrics', details: (error as Error).message });
  }
});

// Query aggregated metrics
app.post('/api/v1/timeseries/query/aggregate', async (req: Request, res: Response) => {
  try {
    const { start_time, end_time, metric_name, entity_id, interval, aggregation } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ error: 'start_time and end_time are required' });
    }

    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name,
      entity_id,
      interval: interval || '1 hour',
      aggregation: aggregation || 'avg'
    };

    const results = await storage.queryAggregated(query);

    res.json({
      success: true,
      count: results.length,
      data: results,
      aggregation: query.aggregation,
      interval: query.interval
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to query aggregated metrics', details: (error as Error).message });
  }
});

// Get compression stats
app.get('/api/v1/timeseries/compression/stats', async (req: Request, res: Response) => {
  try {
    const { table_name } = req.query;
    const stats = await storage.getCompressionStats((table_name as string) || 'ts_metrics');

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get compression stats', details: (error as Error).message });
  }
});

// Detect anomalies
app.post('/api/v1/timeseries/anomalies/detect', async (req: Request, res: Response) => {
  try {
    const { start_time, end_time, metric_name, method, threshold } = req.body;

    if (!start_time || !end_time || !metric_name) {
      return res.status(400).json({ error: 'start_time, end_time, and metric_name are required' });
    }

    // Query data
    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name
    };

    const results = await storage.query(query);
    const data = results.map(r => r.value);
    const timestamps = results.map(r => new Date(r.timestamp));

    // Detect anomalies
    const detector = new StatisticalDetector({
      method: method || 'zscore',
      threshold: threshold || 3.0
    });

    const anomalies = detector.detect(data, timestamps);

    res.json({
      success: true,
      metric_name,
      time_range: { start_time, end_time },
      total_points: data.length,
      anomalies_found: anomalies.length,
      anomaly_rate: anomalies.length / data.length,
      anomalies
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect anomalies', details: (error as Error).message });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`Time Series Service listening on port ${port}`);
});

export default app;
