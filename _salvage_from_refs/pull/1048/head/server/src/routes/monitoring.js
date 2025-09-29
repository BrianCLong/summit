import express from 'express';
import client from 'prom-client';
import { getNeo4jDriver } from '../db/neo4j.js';
import { getPostgresPool } from '../db/postgres.js';
import { getRedisClient } from '../db/redis.js';

const router = express.Router();

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;
const register = new Registry();
collectDefaultMetrics({ register });

// Health check endpoint
router.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Check Neo4j connection
  try {
    const driver = getNeo4jDriver();
    await driver.verifyConnectivity();
    healthStatus.services.neo4j = 'UP';
  } catch (error) {
    healthStatus.status = 'DOWN';
    healthStatus.services.neo4j = 'DOWN';
    console.error('Neo4j health check failed:', error.message);
  }

  // Check Postgres connection
  try {
    const pool = getPostgresPool();
    await pool.query('SELECT 1');
    healthStatus.services.postgres = 'UP';
  } catch (error) {
    healthStatus.status = 'DOWN';
    healthStatus.services.postgres = 'DOWN';
    console.error('Postgres health check failed:', error.message);
  }

  // Check Redis connection
  try {
    const redisClient = getRedisClient();
    await redisClient.ping();
    healthStatus.services.redis = 'UP';
  } catch (error) {
    healthStatus.status = 'DOWN';
    healthStatus.services.redis = 'DOWN';
    console.error('Redis health check failed:', error.message);
  }

  if (healthStatus.status === 'UP') {
    res.status(200).json(healthStatus);
  } else {
    res.status(503).json(healthStatus);
  }
});

// Prometheus metrics endpoint
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;