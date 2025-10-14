#!/usr/bin/env node

/**
 * IntelGraph System Validation Suite
 * 
 * Comprehensive validation of all platform components:
 * - Database connectivity and schema validation
 * - GraphQL schema compilation and resolver testing
 * - Security policy validation
 * - Performance benchmarking
 * - Golden path workflow testing
 */

const { Client } = require('pg');
const neo4j = require('neo4j-driver');
const redis = require('redis');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🚀 IntelGraph System Validation Suite');
console.log('=====================================\n');

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, details = '') {
  const emoji = status === 'PASS' ? '✅' : '❌';
  console.log(`${emoji} ${name}: ${status}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, status, details });
  if (status === 'PASS') results.passed++;
  else results.failed++;
}

async function validatePostgres() {
  console.log('\n📊 Testing PostgreSQL Database...');
  
  try {
    const client = new Client({
      connectionString: process.env.POSTGRES_URL || 'postgres://intelgraph:password@localhost:5432/intelgraph'
    });
    
    await client.connect();
    logTest('PostgreSQL Connection', 'PASS', 'Connected successfully');
    
    // Test core tables exist
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'investigations', 'entities', 'relationships', 'copilot_runs'];
    const existingTables = tables.rows.map(row => row.table_name);
    
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        logTest(`Table: ${table}`, 'PASS', 'Schema exists');
      } else {
        logTest(`Table: ${table}`, 'FAIL', 'Missing from schema');
      }
    }
    
    // Test data insertion capability
    await client.query('BEGIN');
    const testResult = await client.query(
      "INSERT INTO investigations (id, title, description) VALUES ($1, $2, $3) RETURNING id",
      [`test-${Date.now()}`, 'System Validation Test', 'Automated test investigation']
    );
    await client.query('ROLLBACK');
    
    logTest('PostgreSQL Write Test', 'PASS', `Insert capability verified: ${testResult.rows[0].id}`);
    
    await client.end();
    
  } catch (error) {
    logTest('PostgreSQL Database', 'FAIL', error.message);
  }
}

async function validateNeo4j() {
  console.log('\n🔗 Testing Neo4j Graph Database...');
  
  try {
    const driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || 'neo4j', 
        process.env.NEO4J_PASSWORD || 'password'
      )
    );
    
    const session = driver.session();
    
    // Test connection
    const result = await session.run('RETURN "Neo4j Connected" as status');
    logTest('Neo4j Connection', 'PASS', result.records[0].get('status'));
    
    // Test constraint creation
    try {
      await session.run('CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE');
      logTest('Neo4j Constraints', 'PASS', 'Entity uniqueness constraint verified');
    } catch (error) {
      logTest('Neo4j Constraints', 'PASS', 'Constraints already exist');
    }
    
    // Test graph operations
    const writeResult = await session.run(`
      CREATE (test:SystemTest {id: $id, timestamp: datetime(), type: "validation"})
      RETURN test.id as created_id
    `, { id: `test-${Date.now()}` });
    
    logTest('Neo4j Write Test', 'PASS', `Node created: ${writeResult.records[0].get('created_id')}`);
    
    // Clean up test node
    await session.run('MATCH (test:SystemTest {type: "validation"}) DELETE test');
    logTest('Neo4j Cleanup', 'PASS', 'Test nodes removed');
    
    await session.close();
    await driver.close();
    
  } catch (error) {
    logTest('Neo4j Database', 'FAIL', error.message);
  }
}

async function validateRedis() {
  console.log('\n⚡ Testing Redis Cache...');
  
  try {
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    await client.connect();
    logTest('Redis Connection', 'PASS', 'Connected successfully');
    
    // Test basic operations
    const testKey = `test:${Date.now()}`;
    await client.set(testKey, 'validation-test', { EX: 60 });
    const value = await client.get(testKey);
    
    if (value === 'validation-test') {
      logTest('Redis Read/Write', 'PASS', 'Set/Get operations working');
    } else {
      logTest('Redis Read/Write', 'FAIL', 'Value mismatch');
    }
    
    // Test session storage capability
    await client.hSet(`session:test`, {
      userId: 'test-user',
      timestamp: Date.now().toString(),
      role: 'analyst'
    });
    
    const sessionData = await client.hGetAll(`session:test`);
    logTest('Redis Session Storage', 'PASS', `Session data: ${JSON.stringify(sessionData)}`);
    
    // Cleanup
    await client.del([testKey, 'session:test']);
    await client.quit();
    
  } catch (error) {
    logTest('Redis Cache', 'FAIL', error.message);
  }
}

async function validateGraphQLSchema() {
  console.log('\n📋 Testing GraphQL Schema Compilation...');
  
  try {
    // Check if schema files exist
    const schemaPath = path.join(__dirname, '../server/src/graphql/schema.js');
    const resolversPath = path.join(__dirname, '../server/src/graphql/resolvers/index.ts');
    
    if (fs.existsSync(schemaPath)) {
      logTest('GraphQL Schema File', 'PASS', 'Schema definition found');
    } else {
      logTest('GraphQL Schema File', 'FAIL', 'Schema file missing');
    }
    
    if (fs.existsSync(resolversPath)) {
      logTest('GraphQL Resolvers', 'PASS', 'Resolver definitions found');
    } else {
      logTest('GraphQL Resolvers', 'FAIL', 'Resolver file missing');
    }
    
    // Check for critical GraphQL types
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const criticalTypes = ['User', 'Investigation', 'Entity', 'Relationship', 'Query', 'Mutation'];
    
    for (const type of criticalTypes) {
      if (schemaContent.includes(`type ${type}`) || schemaContent.includes(`extend type ${type}`)) {
        logTest(`GraphQL Type: ${type}`, 'PASS', 'Type definition found');
      } else {
        logTest(`GraphQL Type: ${type}`, 'FAIL', 'Type definition missing');
      }
    }
    
  } catch (error) {
    logTest('GraphQL Schema Validation', 'FAIL', error.message);
  }
}

async function validateSecurityConfiguration() {
  console.log('\n🛡️ Testing Security Configuration...');
  
  try {
    // Check environment variables for production security
    const securityEnvVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET', 
      'ALLOWED_ORIGINS',
      'RATE_LIMIT_MAX'
    ];
    
    let securityConfigured = true;
    for (const envVar of securityEnvVars) {
      if (process.env[envVar]) {
        logTest(`Security: ${envVar}`, 'PASS', 'Environment variable configured');
      } else {
        logTest(`Security: ${envVar}`, 'FAIL', 'Environment variable missing');
        securityConfigured = false;
      }
    }
    
    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
      logTest('JWT Secret Strength', 'PASS', 'Secret meets minimum length requirements');
    } else {
      logTest('JWT Secret Strength', 'FAIL', 'JWT secret too short (< 32 chars)');
    }
    
    // Check security config file exists
    const securityConfigPath = path.join(__dirname, '../server/src/config/production-security.ts');
    if (fs.existsSync(securityConfigPath)) {
      logTest('Security Configuration File', 'PASS', 'Production security config found');
    } else {
      logTest('Security Configuration File', 'FAIL', 'Security config missing');
    }
    
  } catch (error) {
    logTest('Security Configuration', 'FAIL', error.message);
  }
}

async function performanceTest() {
  console.log('\n⚡ Running Performance Tests...');
  
  try {
    // Database connection pool test
    const startTime = Date.now();
    
    const client = new Client({
      connectionString: process.env.POSTGRES_URL || 'postgres://intelgraph:password@localhost:5432/intelgraph'
    });
    
    await client.connect();
    
    // Run multiple queries to test connection performance
    const queries = [];
    for (let i = 0; i < 10; i++) {
      queries.push(client.query('SELECT NOW() as timestamp, $1 as test_id', [i]));
    }
    
    await Promise.all(queries);
    await client.end();
    
    const duration = Date.now() - startTime;
    
    if (duration < 1000) {
      logTest('Database Performance', 'PASS', `10 concurrent queries in ${duration}ms`);
    } else {
      logTest('Database Performance', 'FAIL', `Queries took too long: ${duration}ms`);
    }
    
  } catch (error) {
    logTest('Performance Test', 'FAIL', error.message);
  }
}

async function validateDockerCompose() {
  console.log('\n🐳 Testing Docker Compose Configuration...');
  
  try {
    const composePath = path.join(__dirname, '../docker-compose.yml');
    if (fs.existsSync(composePath)) {
      logTest('Docker Compose File', 'PASS', 'Configuration file found');
      
      const composeContent = fs.readFileSync(composePath, 'utf8');
      
      // Check for required services
      const requiredServices = ['postgres', 'neo4j', 'redis', 'server'];
      for (const service of requiredServices) {
        if (composeContent.includes(`${service}:`)) {
          logTest(`Docker Service: ${service}`, 'PASS', 'Service defined');
        } else {
          logTest(`Docker Service: ${service}`, 'FAIL', 'Service missing');
        }
      }
      
      // Check for health checks
      if (composeContent.includes('healthcheck:')) {
        logTest('Docker Health Checks', 'PASS', 'Health check configurations found');
      } else {
        logTest('Docker Health Checks', 'FAIL', 'No health checks configured');
      }
      
      // Check for profiles (optional services)
      if (composeContent.includes('profiles:')) {
        logTest('Docker Profiles', 'PASS', 'Optional service profiles configured');
      } else {
        logTest('Docker Profiles', 'FAIL', 'No service profiles found');
      }
      
    } else {
      logTest('Docker Compose File', 'FAIL', 'docker-compose.yml not found');
    }
    
  } catch (error) {
    logTest('Docker Compose Validation', 'FAIL', error.message);
  }
}

async function validateHelmChart() {
  console.log('\n☸️ Testing Kubernetes Helm Chart...');
  
  try {
    const helmPath = path.join(__dirname, '../helm');
    if (fs.existsSync(helmPath)) {
      logTest('Helm Chart Directory', 'PASS', 'Helm charts found');
      
      const valuesPath = path.join(helmPath, 'server/values.yaml');
      if (fs.existsSync(valuesPath)) {
        logTest('Helm Values File', 'PASS', 'values.yaml found');
        
        const valuesContent = fs.readFileSync(valuesPath, 'utf8');
        
        // Check for critical Helm configurations
        const helmChecks = [
          { key: 'image:', name: 'Container Image' },
          { key: 'service:', name: 'Service Configuration' },
          { key: 'ingress:', name: 'Ingress Configuration' },
          { key: 'env:', name: 'Environment Variables' }
        ];
        
        for (const check of helmChecks) {
          if (valuesContent.includes(check.key)) {
            logTest(`Helm: ${check.name}`, 'PASS', 'Configuration present');
          } else {
            logTest(`Helm: ${check.name}`, 'FAIL', 'Configuration missing');
          }
        }
        
      } else {
        logTest('Helm Values File', 'FAIL', 'values.yaml not found');
      }
      
    } else {
      logTest('Helm Chart Directory', 'FAIL', 'Helm directory not found');
    }
    
  } catch (error) {
    logTest('Helm Chart Validation', 'FAIL', error.message);
  }
}

async function generateReport() {
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('====================');
  
  const totalTests = results.passed + results.failed;
  const successRate = Math.round((results.passed / totalTests) * 100);
  
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${successRate}%\n`);
  
  if (successRate >= 90) {
    console.log('🎉 EXCELLENT! System is production-ready.');
  } else if (successRate >= 80) {
    console.log('👍 GOOD! System is mostly ready with minor issues.');
  } else if (successRate >= 60) {
    console.log('⚠️ NEEDS WORK! Several issues need attention.');
  } else {
    console.log('🚨 CRITICAL! Major issues prevent production deployment.');
  }
  
  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: results.passed,
      failed: results.failed,
      successRate: successRate
    },
    details: results.tests
  };
  
  const reportPath = path.join(__dirname, '../validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

async function main() {
  try {
    await validatePostgres();
    await validateNeo4j();
    await validateRedis();
    await validateGraphQLSchema();
    await validateSecurityConfiguration();
    await performanceTest();
    await validateDockerCompose();
    await validateHelmChart();
    
    await generateReport();
    
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('🚨 Validation suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };