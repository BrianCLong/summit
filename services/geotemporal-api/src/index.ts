/**
 * Geo-Temporal Analytics API Service
 *
 * Provides HTTP REST APIs for trajectory analysis, stay-point detection,
 * co-presence detection, and convoy detection.
 */

import express, { type Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import neo4j from 'neo4j-driver';
import { Neo4jGeoGraphRepository, GeoTemporalService } from '@intelgraph/geospatial';
import geotemporalRoutes from './routes/geotemporal.js';

const app: Application = express();
const PORT = process.env.PORT || 4100;

// Environment configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'geotemporal-api',
    timestamp: new Date().toISOString(),
  });
});

// Initialize Neo4j connection
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 60000, // 1 minute
  },
);

// Initialize repository and service
const repository = new Neo4jGeoGraphRepository(driver, NEO4J_DATABASE);
const geoTemporalService = new GeoTemporalService(repository);

// Mount routes with service dependency injection
app.use('/api/geotemporal', geotemporalRoutes(geoTemporalService));

// Error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  },
);

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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app };
