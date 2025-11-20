/**
 * IntelGraph Forecasting Service
 * REST API for time series forecasting and prediction
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
import { ARIMA, ExponentialSmoothing, EnsembleForecaster, Backtesting } from '@intelgraph/forecasting';
import { SeasonalDecomposition } from '@intelgraph/seasonal-decomposition';
import { FeatureExtractor } from '@intelgraph/ts-feature-engineering';

const app: Express = express();
const port = process.env.FORECAST_SERVICE_PORT || 3011;

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
  res.json({ status: 'healthy', service: 'forecasting', timestamp: new Date() });
});

// Generate forecast using ARIMA
app.post('/api/v1/forecast/arima', async (req: Request, res: Response) => {
  try {
    const { metric_name, start_time, end_time, horizon, config } = req.body;

    if (!metric_name || !start_time || !end_time || !horizon) {
      return res.status(400).json({ error: 'metric_name, start_time, end_time, and horizon are required' });
    }

    // Fetch training data
    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name
    };

    const results = await storage.query(query);
    const data = results.map(r => r.value);
    const timestamps = results.map(r => new Date(r.timestamp));

    if (data.length < 30) {
      return res.status(400).json({ error: 'Insufficient data points (minimum 30 required)' });
    }

    // Fit ARIMA model
    const arimaConfig = config || { p: 1, d: 1, q: 1 };
    const model = new ARIMA(arimaConfig);
    await model.fit(data);

    // Generate forecast
    const forecasts = await model.forecast(horizon);

    res.json({
      success: true,
      model: 'ARIMA',
      config: arimaConfig,
      training_points: data.length,
      forecast_horizon: horizon,
      forecasts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate forecast', details: (error as Error).message });
  }
});

// Generate forecast using Exponential Smoothing
app.post('/api/v1/forecast/exponential-smoothing', async (req: Request, res: Response) => {
  try {
    const { metric_name, start_time, end_time, horizon, config } = req.body;

    if (!metric_name || !start_time || !end_time || !horizon) {
      return res.status(400).json({ error: 'metric_name, start_time, end_time, and horizon are required' });
    }

    // Fetch training data
    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name
    };

    const results = await storage.query(query);
    const data = results.map(r => r.value);

    if (data.length < 30) {
      return res.status(400).json({ error: 'Insufficient data points (minimum 30 required)' });
    }

    // Fit model
    const esConfig = config || { trend: 'add', seasonal: 'add', seasonal_periods: 24 };
    const model = new ExponentialSmoothing(esConfig);
    await model.fit(data);

    // Generate forecast
    const forecasts = await model.forecast(horizon);

    res.json({
      success: true,
      model: 'Exponential Smoothing',
      config: esConfig,
      training_points: data.length,
      forecast_horizon: horizon,
      forecasts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate forecast', details: (error as Error).message });
  }
});

// Perform seasonal decomposition
app.post('/api/v1/decompose/seasonal', async (req: Request, res: Response) => {
  try {
    const { metric_name, start_time, end_time, period, method } = req.body;

    if (!metric_name || !start_time || !end_time || !period) {
      return res.status(400).json({ error: 'metric_name, start_time, end_time, and period are required' });
    }

    // Fetch data
    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name
    };

    const results = await storage.query(query);
    const data = results.map(r => r.value);
    const timestamps = results.map(r => new Date(r.timestamp));

    if (data.length < period * 2) {
      return res.status(400).json({ error: `Insufficient data points (minimum ${period * 2} required for period ${period})` });
    }

    // Perform decomposition
    let decomposition;
    if (method === 'stl') {
      decomposition = SeasonalDecomposition.stlDecomposition(data, timestamps, { period });
    } else if (method === 'multiplicative') {
      decomposition = SeasonalDecomposition.multiplicativeDecomposition(data, timestamps, period);
    } else {
      decomposition = SeasonalDecomposition.additiveDecomposition(data, timestamps, period);
    }

    res.json({
      success: true,
      metric_name,
      method: decomposition.method,
      period,
      data_points: data.length,
      seasonality_strength: decomposition.seasonality_strength,
      trend_strength: decomposition.trend_strength,
      decomposition
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to decompose time series', details: (error as Error).message });
  }
});

// Extract time series features
app.post('/api/v1/features/extract', async (req: Request, res: Response) => {
  try {
    const { metric_name, start_time, end_time } = req.body;

    if (!metric_name || !start_time || !end_time) {
      return res.status(400).json({ error: 'metric_name, start_time, and end_time are required' });
    }

    // Fetch data
    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name
    };

    const results = await storage.query(query);
    const data = results.map(r => r.value);
    const timestamps = results.map(r => new Date(r.timestamp));

    if (data.length < 10) {
      return res.status(400).json({ error: 'Insufficient data points (minimum 10 required)' });
    }

    // Extract features
    const features = FeatureExtractor.extractFeatures(data, timestamps);

    res.json({
      success: true,
      metric_name,
      data_points: data.length,
      time_range: { start_time, end_time },
      features
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to extract features', details: (error as Error).message });
  }
});

// Auto-select best model
app.post('/api/v1/forecast/auto', async (req: Request, res: Response) => {
  try {
    const { metric_name, start_time, end_time, horizon } = req.body;

    if (!metric_name || !start_time || !end_time || !horizon) {
      return res.status(400).json({ error: 'metric_name, start_time, end_time, and horizon are required' });
    }

    // Fetch data
    const query = {
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      metric_name
    };

    const results = await storage.query(query);
    const data = results.map(r => r.value);
    const timestamps = results.map(r => new Date(r.timestamp));

    if (data.length < 50) {
      return res.status(400).json({ error: 'Insufficient data points (minimum 50 required for auto-selection)' });
    }

    // Try ARIMA auto-fit
    const arimaResult = await ARIMA.autoFit(data);

    // Fit final model and forecast
    const model = new ARIMA(arimaResult.config);
    await model.fit(data);
    const forecasts = await model.forecast(horizon);

    res.json({
      success: true,
      selected_model: 'ARIMA',
      config: arimaResult.config,
      validation_metrics: arimaResult.metrics,
      training_points: data.length,
      forecast_horizon: horizon,
      forecasts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to auto-select model', details: (error as Error).message });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(port, () => {
  console.log(`Forecasting Service listening on port ${port}`);
});

export default app;
