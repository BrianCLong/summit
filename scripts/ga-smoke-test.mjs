#!/usr/bin/env node

/**
 * Summit GA Smoke Test (Lightweight)
 *
 * Purpose: Performs a fast, non-destructive validation of the primary
 * user "Golden Path" to confirm functional health in under 30 seconds.
 */

import { performance } from 'perf_hooks';

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const GRAPHQL_URL = `${API_URL}/graphql`;

async function runTest(name, testFn) {
  const start = performance.now();
  try {
    await testFn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`✅ PASSED: ${name.padEnd(30)} (${duration}ms)`);
    return true;
  } catch (err) {
    console.log(`❌ FAILED: ${name.padEnd(30)} | ${err.message}`);
    return false;
  }
}

async function testHealth() {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== 'healthy') throw new Error(`Status: ${data.status}`);
}

async function testGraphQL() {
  const query = '{ __typename }';
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0].message);
}

async function testAuthProtection() {
  // Attempt to query current user without token
  const query = '{ me { id email } }';
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  if (!data.errors || !data.errors.some(e => e.message.toLowerCase().includes('auth'))) {
    throw new Error('Endpoint not correctly protected by authentication');
  }
}

async function run() {
  console.log(`🚀 Starting Summit GA Smoke Test against ${API_URL}...\n`);

  const results = [
    await runTest('API Health Endpoint', testHealth),
    await runTest('GraphQL Schema Introspection', testGraphQL),
    await runTest('Unauthorized Access Blocked', testAuthProtection),
  ];

  const allPassed = results.every(r => r === true);

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('💚 SMOKE TEST SUCCESSFUL - Golden Path Functional');
    process.exit(0);
  } else {
    console.log('🔴 SMOKE TEST FAILED');
    process.exit(1);
  }
}

run();
