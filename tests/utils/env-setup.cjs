/**
 * Jest Environment Setup
 *
 * This file runs BEFORE test modules are loaded.
 * Sets up environment variables needed by config.ts
 */

// Load test environment from .env.test if it exists
require('dotenv').config({ path: './.env.test' });

// Mock required environment variables for config.ts validation
// These must be set before any imports that load config.ts
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/intelgraph_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only-must-be-32-chars';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-for-testing-only-32-chars';
process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// Use Zero Footprint mode to avoid real DB connections by default
process.env.ZERO_FOOTPRINT = 'true';
process.env.NODE_ENV = 'test';
