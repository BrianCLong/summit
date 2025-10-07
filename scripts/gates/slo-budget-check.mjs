#!/usr/bin/env node

// scripts/gates/slo-budget-check.mjs
// Enforces SLOs and error budgets as quality gates
// Prevents deployments if service level objectives are breached

import fs from 'fs';
import { execSync } from 'child_process';

// Default SLO thresholds (can be overridden via CLI args)
const DEFAULT_THRESHOLDS = {
  // API Latency SLOs
  api_p95_ms: 350,       // 95th percentile latency in ms
  api_p99_ms: 900,       // 99th percentile latency in ms
  
  // Write Operation SLOs
  write_p95_ms: 700,     // 95th percentile write latency in ms
  write_p99_ms: 1500,    // 99th percentile write latency in ms
  
  // Ingestion SLOs
  ingest_pps: 1000,      // Packets per second
  ingest_proc_p95_ms: 100, // 95th percentile ingestion processing time in ms
  
  // Error Budgets (per million operations)
  budget_api_per_1M: 2,  // Max 2 errors per 1 million API calls
  budget_ingest_per_1k: 0.10  // Max 0.10 errors per 1000 ingestion operations
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (key && value !== undefined) {
        config[key] = isNaN(value) ? value : parseFloat(value);
      }
    }
  });
  
  return { ...DEFAULT_THRESHOLDS, ...config };
}

// Mock metrics collection (in real implementation, this would query Prometheus/OpenTelemetry)
function collectMetrics() {
  console.log('Collecting metrics for SLO validation...');
  
  // Simulated metrics - in production, these would come from Prometheus/OpenTelemetry
  return {
    api: {
      p95_lat: 320,     // milliseconds
      p99_lat: 850,     // milliseconds
      total_calls: 1000000,
      errors: 1       // actual errors
    },
    write: {
      p95_lat: 650,     // milliseconds
      p99_lat: 1400,    // milliseconds
      total_ops: 50000,
      errors: 0
    },
    ingest: {
      packets_per_sec: 950,  // slightly below threshold
      proc_p95_lat: 95,      // milliseconds
      total_ops: 1000,
      errors: 0
    }
  };
}

function validateSLOs(metrics, config) {
  console.log('Validating SLOs against thresholds...');
  
  const violations = [];
  
  // API Latency SLOs
  if (metrics.api.p95_lat > config.api_p95_ms) {
    violations.push({
      type: 'API_LATENCY_P95',
      message: `API P95 latency (${metrics.api.p95_lat}ms) exceeds SLO (${config.api_p95_ms}ms)`,
      currentValue: metrics.api.p95_lat,
      threshold: config.api_p95_ms,
      severity: 'CRITICAL'
    });
  }
  
  if (metrics.api.p99_lat > config.api_p99_ms) {
    violations.push({
      type: 'API_LATENCY_P99',
      message: `API P99 latency (${metrics.api.p99_lat}ms) exceeds SLO (${config.api_p99_ms}ms)`,
      currentValue: metrics.api.p99_lat,
      threshold: config.api_p99_ms,
      severity: 'CRITICAL'
    });
  }
  
  // Write Operation SLOs
  if (metrics.write.p95_lat > config.write_p95_ms) {
    violations.push({
      type: 'WRITE_LATENCY_P95',
      message: `Write P95 latency (${metrics.write.p95_lat}ms) exceeds SLO (${config.write_p95_ms}ms)`,
      currentValue: metrics.write.p95_lat,
      threshold: config.write_p95_ms,
      severity: 'WARNING'
    });
  }
  
  if (metrics.write.p99_lat > config.write_p99_ms) {
    violations.push({
      type: 'WRITE_LATENCY_P99',
      message: `Write P99 latency (${metrics.write.p99_lat}ms) exceeds SLO (${config.write_p99_ms}ms)`,
      currentValue: metrics.write.p99_lat,
      threshold: config.write_p99_ms,
      severity: 'WARNING'
    });
  }
  
  // Ingestion SLOs
  if (metrics.ingest.packets_per_sec < config.ingest_pps) {
    violations.push({
      type: 'INGEST_PACKET_RATE',
      message: `Ingest packet rate (${metrics.ingest.packets_per_sec}/sec) below SLO (${config.ingest_pps}/sec)`,
      currentValue: metrics.ingest.packets_per_sec,
      threshold: config.ingest_pps,
      severity: 'WARNING'
    });
  }
  
  if (metrics.ingest.proc_p95_lat > config.ingest_proc_p95_ms) {
    violations.push({
      type: 'INGEST_PROC_LATENCY',
      message: `Ingest processing P95 latency (${metrics.ingest.proc_p95_lat}ms) exceeds SLO (${config.ingest_proc_p95_ms}ms)`,
      currentValue: metrics.ingest.proc_p95_lat,
      threshold: config.ingest_proc_p95_ms,
      severity: 'WARNING'
    });
  }
  
  return violations;
}

function validateBudgets(metrics, config) {
  console.log('Validating error budgets...');
  
  const violations = [];
  
  // API Error Budget
  const apiErrorRate = metrics.api.errors / metrics.api.total_calls;
  const apiBudgetRate = config.budget_api_per_1M / 1000000;
  if (apiErrorRate > apiBudgetRate) {
    violations.push({
      type: 'API_ERROR_BUDGET',
      message: `API error rate (${(apiErrorRate * 100).toFixed(4)}%) exceeds budget (${(apiBudgetRate * 100).toFixed(4)}%)`,
      currentValue: apiErrorRate,
      threshold: apiBudgetRate,
      severity: 'CRITICAL'
    });
  }
  
  // Ingestion Error Budget
  const ingestErrorRate = metrics.ingest.errors / metrics.ingest.total_ops;
  const ingestBudgetRate = config.budget_ingest_per_1k / 1000;
  if (ingestErrorRate > ingestBudgetRate) {
    violations.push({
      type: 'INGEST_ERROR_BUDGET',
      message: `Ingest error rate (${(ingestErrorRate * 100).toFixed(4)}%) exceeds budget (${(ingestBudgetRate * 100).toFixed(4)}%)`,
      currentValue: ingestErrorRate,
      threshold: ingestBudgetRate,
      severity: 'WARNING'
    });
  }
  
  return violations;
}

function emitMetrics(metrics, config) {
  console.log('\n# SLO & Budget Metrics');
  console.log(`api_p95_latency_ms{threshold="${config.api_p95_ms}"} ${metrics.api.p95_lat}`);
  console.log(`api_p99_latency_ms{threshold="${config.api_p99_ms}"} ${metrics.api.p99_lat}`);
  console.log(`api_errors{budget="${config.budget_api_per_1M}"} ${metrics.api.errors}`);
  console.log(`api_calls_total ${metrics.api.total_calls}`);
  console.log(`write_p95_latency_ms{threshold="${config.write_p95_ms}"} ${metrics.write.p95_lat}`);
  console.log(`ingest_packets_per_second{threshold="${config.ingest_pps}"} ${metrics.ingest.packets_per_sec}`);
  
  // Error rates
  const apiErrorRate = metrics.api.errors / metrics.api.total_calls;
  const ingestErrorRate = metrics.ingest.errors / metrics.ingest.total_ops;
  console.log(`api_error_rate{budget="${config.budget_api_per_1M}"} ${apiErrorRate}`);
  console.log(`ingest_error_rate{budget="${config.budget_ingest_per_1k}"} ${ingestErrorRate}`);
}

function main() {
  const config = parseArgs();
  console.log('Running SLO & Budget validation with config:', config);
  
  // Collect current metrics
  const metrics = collectMetrics();
  
  // Validate SLOs
  const sloViolations = validateSLOs(metrics, config);
  
  // Validate error budgets
  const budgetViolations = validateBudgets(metrics, config);
  
  // Combine all violations
  const allViolations = [...sloViolations, ...budgetViolations];
  
  // Emit metrics for monitoring
  emitMetrics(metrics, config);
  
  // Report results
  if (allViolations.length > 0) {
    console.log(`\n🚨 ${allViolations.length} SLO/Budget violations detected:`);
    allViolations.forEach(violation => {
      console.log(`  ❌ [${violation.severity}] ${violation.type}: ${violation.message}`);
    });
    
    // Critical violations should block deployment
    const criticalViolations = allViolations.filter(v => v.severity === 'CRITICAL');
    if (criticalViolations.length > 0) {
      console.log(`\n🛑 CRITICAL VIOLATIONS DETECTED - Blocking deployment`);
      process.exit(1);
    }
    
    // Warning violations should be logged but not block
    const warningViolations = allViolations.filter(v => v.severity === 'WARNING');
    if (warningViolations.length > 0) {
      console.log(`\n⚠️ WARNING VIOLATIONS DETECTED - Proceeding with caution`);
      process.exit(0);
    }
  } else {
    console.log('\n✅ All SLOs and budgets are within acceptable thresholds');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Run main function
main().catch(error => {
  console.error('SLO/Budget validation failed:', error);
  process.exit(1);
});