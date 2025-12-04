/**
 * Jest Global Setup (CommonJS)
 * Runs once before all tests start
 * Sets up test databases, environment variables, and global resources
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Starting Jest Global Setup...');

  try {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = process.env.DEBUG_TESTS ? 'info' : 'error';

    if (!process.env.NEO4J_URI) {
      process.env.NEO4J_URI = 'bolt://localhost:7687';
      process.env.NEO4J_USER = 'neo4j';
      process.env.NEO4J_PASSWORD = 'testpassword';
    }

    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'postgresql://postgres:testpassword@localhost:5432/intelgraph_test';
    }

    if (!process.env.POSTGRES_HOST) {
      process.env.POSTGRES_HOST = 'localhost';
      process.env.POSTGRES_PORT = '5432';
      process.env.POSTGRES_DB = 'intelgraph_test';
      process.env.POSTGRES_USER = 'postgres';
      process.env.POSTGRES_PASSWORD = 'testpassword';
    }

    if (!process.env.REDIS_URL) {
      process.env.REDIS_URL = 'redis://localhost:6379/1';
    }

    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-for-testing-only';
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

    const testDirs = [
      path.join(__dirname, '../../tmp'),
      path.join(__dirname, '../../test-results'),
      path.join(__dirname, '../../coverage'),
    ];

    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    if (process.env.CI) {
      console.log('⏳ Waiting for test services (CI)...');
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log('✅ Jest Global Setup completed successfully');
  } catch (error) {
    console.error('❌ Jest Global Setup failed:', error);
    throw error;
  }
};
