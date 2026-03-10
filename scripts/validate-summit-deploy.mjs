#!/usr/bin/env node

/**
 * Summit GA Post-Deploy Validation Script
 * 
 * Purpose: Provides a deterministic "Go/No-Go" health check immediately after deployment.
 * Usage: node scripts/validate-summit-deploy.mjs [--env production|staging] [--url http://localhost:4000]
 */

import { execSync } from 'child_process';

const SERVICES = [
  { name: 'api-gateway', port: 4000, path: '/health' },
  { name: 'server', port: 4001, path: '/health' },
  { name: 'prov-ledger', port: 4010, path: '/health' },
  { name: 'policy-lac', port: 4011, path: '/health' },
  { name: 'nl2cypher', port: 4020, path: '/health' },
  { name: 'web', port: 3000, path: '/' },
  { name: 'rag', port: 8001, path: '/health' },
  { name: 'graphrag', port: 8002, path: '/health' },
  { name: 'prometheus', port: 9090, path: '/-/healthy' },
  { name: 'grafana', port: 3001, path: '/api/health' }
];

const DB_CHECKS = [
  { name: 'neo4j', port: 7474 },
  { name: 'redis', port: 6379 },
  { name: 'postgres', port: 5432 }
];

async function checkHealth(service, baseUrl) {
  const url = `${baseUrl}:${service.port}${service.path}`;
  try {
    const start = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const duration = Date.now() - start;
    
    return {
      name: service.name,
      status: res.status,
      ok: res.ok,
      duration: `${duration}ms`,
      error: null
    };
  } catch (err) {
    return {
      name: service.name,
      status: 0,
      ok: false,
      duration: 'N/A',
      error: err.message
    };
  }
}

async function checkPort(db) {
  try {
    // Simple nc check for port availability
    execSync(`nc -z -w 2 localhost ${db.port}`);
    return { name: db.name, ok: true, error: null };
  } catch (err) {
    return { name: db.name, ok: false, error: 'Port unreachable' };
  }
}

async function checkPrometheusAlerts() {
  const url = 'http://localhost:9090/api/v1/alerts';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const activeAlerts = data.data?.alerts?.filter(a => a.state === 'firing') || [];
    const criticalAlerts = activeAlerts.filter(a => a.labels?.severity === 'critical' || a.labels?.severity === 'p0');
    
    return {
      ok: true,
      total: activeAlerts.length,
      critical: criticalAlerts.length,
      alerts: criticalAlerts.map(a => a.labels?.alertname)
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function validateEvidence() {
  try {
    // Check if we are in a repo that just ran a release
    const hasEvidence = execSync('ls evidence-bundle.tar.gz 2>/dev/null || echo "none"').toString().trim();
    if (hasEvidence === 'none') {
      return { ok: 'warning', message: 'No evidence-bundle.tar.gz found in current directory' };
    }
    // Verify checksum if SHA256SUMS exists
    const checksumOk = execSync('sha256sum -c SHA256SUMS 2>/dev/null | grep evidence-bundle || echo "fail"').toString().trim();
    return { ok: !checksumOk.includes('fail'), message: 'Evidence bundle checksum verified' };
  } catch (err) {
    return { ok: false, message: 'Evidence validation failed' };
  }
}

async function run() {
  console.log('🚀 Starting Summit GA Post-Deploy Validation...\n');
  
  const baseUrl = process.env.BASE_URL || 'http://localhost';
  
  console.log('--- Service Health ---');
  const serviceResults = await Promise.all(SERVICES.map(s => checkHealth(s, baseUrl)));
  serviceResults.forEach(r => {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.name.padEnd(15)} | Status: ${r.status} | Time: ${r.duration.padStart(6)} | ${r.error || ''}`);
  });

  console.log('\n--- Database Connectivity ---');
  const dbResults = await Promise.all(DB_CHECKS.map(checkPort));
  dbResults.forEach(r => {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.name.padEnd(15)} | ${r.error || 'Connected'}`);
  });

  console.log('\n--- Active Alerts ---');
  const alertResult = await checkPrometheusAlerts();
  if (alertResult.ok) {
    const icon = alertResult.critical === 0 ? '✅' : '❌';
    console.log(`${icon} Critical Alerts: ${alertResult.critical}`);
    if (alertResult.critical > 0) {
      console.log(`   Firing: ${alertResult.alerts.join(', ')}`);
    }
  } else {
    console.log(`⚠️  Could not reach Prometheus: ${alertResult.error}`);
  }

  console.log('\n--- Evidence Integrity ---');
  const evidenceResult = await validateEvidence();
  const eIcon = evidenceResult.ok === true ? '✅' : (evidenceResult.ok === 'warning' ? '⚠️ ' : '❌');
  console.log(`${eIcon} ${evidenceResult.message}`);

  const allOk = serviceResults.every(r => r.ok) && 
                dbResults.every(r => r.ok) && 
                (alertResult.ok ? alertResult.critical === 0 : true);

  console.log('\n' + '='.repeat(50));
  if (allOk) {
    console.log('💚 DEPLOY VALIDATION SUCCESSFUL');
    console.log('Status: GREEN - Continue with first-week operations.');
  } else {
    console.log('🔴 DEPLOY VALIDATION FAILED');
    console.log('Status: RED - Immediate investigation or ROLLBACK recommended.');
    process.exit(1);
  }
}

run();
