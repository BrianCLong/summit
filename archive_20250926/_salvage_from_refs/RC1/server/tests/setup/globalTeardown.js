/**
 * Jest Global Teardown
 * Runs once after all tests complete
 * Cleans up test databases, temporary files, and global resources
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Starting Jest Global Teardown...');
  
  try {
    // Clean up test databases (if using in-memory or temp databases)
    await cleanupTestData();
    
    // Clean up temporary directories
    await cleanupTempDirectories();
    
    // Close any global connections
    await closeGlobalConnections();
    
    console.log('✅ Jest Global Teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Jest Global Teardown failed:', error);
    // Don't throw here as it would cause test failures
  }
};

async function cleanupTestData() {
  // Clean up any test data if needed
  // This could include clearing test databases or removing test files
  console.log('🗑️ Cleaning up test data...');
  
  // Example: Clear Neo4j test data
  // const neo4j = require('neo4j-driver');
  // const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
  // const session = driver.session();
  // try {
  //   await session.run('MATCH (n) WHERE n.id STARTS WITH "test_" DETACH DELETE n');
  // } finally {
  //   await session.close();
  //   await driver.close();
  // }
}

async function cleanupTempDirectories() {
  console.log('🗑️ Cleaning up temporary directories...');
  
  const tempDirs = [
    path.join(__dirname, '../../tmp')
  ];
  
  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Could not clean up ${dir}:`, error.message);
      }
    }
  }
}

async function closeGlobalConnections() {
  console.log('🔌 Closing global connections...');
  
  // Close any global database connections, Redis clients, etc.
  // This ensures no hanging connections after tests complete
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}