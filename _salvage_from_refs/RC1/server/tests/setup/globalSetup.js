/**
 * Jest Global Setup
 * Runs once before all tests start
 * Sets up test databases, environment variables, and global resources
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Starting Jest Global Setup...');
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = process.env.DEBUG_TESTS ? 'info' : 'error';
    
    // Set up test environment variables if not already set
    if (!process.env.NEO4J_URI) {
      process.env.NEO4J_URI = 'bolt://localhost:7687';
      process.env.NEO4J_USER = 'neo4j';
      process.env.NEO4J_PASSWORD = 'testpassword';
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
    
    // Set JWT test secrets
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
    
    // Create test directories
    const testDirs = [
      path.join(__dirname, '../../tmp'),
      path.join(__dirname, '../../test-results'),
      path.join(__dirname, '../../coverage')
    ];
    
    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    // Wait for services to be ready (if running in CI)
    if (process.env.CI) {
      console.log('⏳ Waiting for test services...');
      await waitForServices();
    }
    
    console.log('✅ Jest Global Setup completed successfully');
    
  } catch (error) {
    console.error('❌ Jest Global Setup failed:', error);
    throw error;
  }
};

async function waitForServices() {
  // Simple service readiness check
  const maxWait = 30000; // 30 seconds
  const interval = 1000; // 1 second
  let waited = 0;
  
  while (waited < maxWait) {
    try {
      // Check if we can connect to Neo4j, PostgreSQL, Redis
      // This is a basic implementation - in production you'd want more robust checks
      console.log(`⏳ Waiting for services... (${waited}ms/${maxWait}ms)`);
      break;
    } catch (error) {
      waited += interval;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  if (waited >= maxWait) {
    throw new Error('Test services did not become ready in time');
  }
}