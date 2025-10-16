#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Running Maestro Conductor v24.1 Validation Suite...\n');

const results = [];

// Helper function to add test results
function addResult(name, status, details = '') {
  results.push({ name, status, details });
  const emoji = status === 'PASS' ? '✅' : '❌';
  console.log(`${emoji} ${name}: ${status}${details ? ` - ${details}` : ''}`);
}

// Check environment variables
function checkEnvVar(varName, required = true) {
  const value = process.env[varName];
  if (required && !value) {
    addResult(`Security: ${varName}`, 'FAIL', 'Environment variable missing');
    return false;
  } else if (value) {
    addResult(
      `Security: ${varName}`,
      'PASS',
      'Environment variable configured',
    );
    return true;
  } else {
    addResult(`Security: ${varName}`, 'PASS', 'Optional environment variable');
    return true;
  }
}

// Check file existence
function checkFile(filePath, name) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    addResult(name, 'PASS', 'File found');
    return true;
  } else {
    addResult(name, 'FAIL', 'File not found');
    return false;
  }
}

// Check GraphQL schema types (v24 Coherence domain)
function checkGraphQLTypes() {
  try {
    const schemaPath = path.join(__dirname, '../server/src/graphql/schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Check for v24 Coherence types
    const requiredTypes = ['Signal', 'CoherenceScore', 'Query', 'Mutation'];
    requiredTypes.forEach((type) => {
      if (schemaContent.includes(`type ${type}`)) {
        addResult(`GraphQL Type: ${type}`, 'PASS', 'Type definition found');
      } else {
        addResult(`GraphQL Type: ${type}`, 'FAIL', 'Type definition missing');
      }
    });
  } catch (error) {
    addResult('GraphQL Schema File', 'FAIL', error.message);
  }
}

// Check database connectivity (basic file existence)
function checkDatabaseClients() {
  // Check if real clients are implemented
  try {
    const pgPath = path.join(__dirname, '../server/src/db/pg.ts');
    const pgContent = fs.readFileSync(pgPath, 'utf8');

    if (
      pgContent.includes('import { Pool }') &&
      pgContent.includes('healthCheck')
    ) {
      addResult(
        'PostgreSQL Database',
        'PASS',
        'Real client implemented with health checks',
      );
    } else {
      addResult(
        'PostgreSQL Database',
        'FAIL',
        'Still using stub implementation',
      );
    }

    const neoPath = path.join(__dirname, '../server/src/db/neo4j.ts');
    const neoContent = fs.readFileSync(neoPath, 'utf8');

    if (
      neoContent.includes('import neo4j') &&
      neoContent.includes('healthCheck')
    ) {
      addResult(
        'Neo4j Database',
        'PASS',
        'Real driver implemented with health checks',
      );
    } else {
      addResult('Neo4j Database', 'FAIL', 'Still using stub implementation');
    }

    const pubsubPath = path.join(
      __dirname,
      '../server/src/subscriptions/pubsub.ts',
    );
    const pubsubContent = fs.readFileSync(pubsubPath, 'utf8');

    if (
      pubsubContent.includes('Redis') &&
      pubsubContent.includes('healthCheck')
    ) {
      addResult(
        'Redis Cache',
        'PASS',
        'Redis PubSub implemented with health checks',
      );
    } else {
      addResult('Redis Cache', 'FAIL', 'Redis not properly configured');
    }
  } catch (error) {
    addResult('Database Client Check', 'FAIL', error.message);
  }
}

// Check persisted queries
function checkPersistedQueries() {
  try {
    const pqPath = path.join(__dirname, '../.maestro/persisted-queries.json');
    if (fs.existsSync(pqPath)) {
      const pqContent = JSON.parse(fs.readFileSync(pqPath, 'utf8'));
      const queryCount = Object.keys(pqContent).length;
      addResult('Persisted Queries', 'PASS', `${queryCount} queries defined`);
    } else {
      addResult(
        'Persisted Queries',
        'FAIL',
        'Persisted queries file not found',
      );
    }
  } catch (error) {
    addResult('Persisted Queries', 'FAIL', error.message);
  }
}

// Run all checks
console.log('Database Connectivity:');
checkDatabaseClients();

console.log('\nGraphQL Schema:');
checkFile('server/src/graphql/schema.ts', 'GraphQL Schema File');
checkFile('server/src/graphql/resolvers.ts', 'GraphQL Resolvers');
checkGraphQLTypes();

console.log('\nSecurity Configuration:');
checkEnvVar('JWT_SECRET');
checkEnvVar('JWT_REFRESH_SECRET');
checkEnvVar('ALLOWED_ORIGINS');
checkEnvVar('RATE_LIMIT_MAX');

console.log('\nInfrastructure:');
checkFile('docker-compose.yml', 'Docker Compose File');
checkFile('charts/maestro', 'Helm Chart Directory');
checkPersistedQueries();

console.log('\nPerformance Testing:');
checkFile('.maestro/tests/k6', 'Performance Test Directory');

// Summary
const passed = results.filter((r) => r.status === 'PASS').length;
const failed = results.filter((r) => r.status === 'FAIL').length;
const total = results.length;
const successRate = Math.round((passed / total) * 100);

console.log(`\n📊 Validation Summary:`);
console.log(`Total checks: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success rate: ${successRate}%`);

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total,
    passed,
    failed,
    successRate,
  },
  details: results,
};

const reportPath = path.join(__dirname, '../validation-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📝 Detailed report saved to: ${reportPath}`);

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
