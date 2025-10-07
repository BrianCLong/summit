#!/usr/bin/env node

// scripts/probes/slo-validate.mjs
// Validates SLO compliance during canary deployments
// Uses time-series data to determine if release meets quality criteria

import { execSync } from 'child_process';

// Default configuration
const DEFAULT_CONFIG = {
  window: '10m',        // Time window to evaluate
  minSamples: 500,      // Minimum number of samples required
  apiLatencyP95: 350,   // 95th percentile latency threshold (ms)
  apiLatencyP99: 900,   // 99th percentile latency threshold (ms)
  errorRateThreshold: 0.002  // 0.2% error rate threshold
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (key && value !== undefined) {
        if (key === 'minSamples') {
          config[key] = parseInt(value);
        } else if (key === 'apiLatencyP95' || key === 'apiLatencyP99' || key === 'errorRateThreshold') {
          config[key] = parseFloat(value);
        } else {
          config[key] = value;
        }
      }
    }
  });
  
  return config;
}

// Mock function to simulate querying Prometheus/OpenTelemetry
// In a real implementation, this would connect to your metrics backend
function queryMetrics(query, window) {
  console.log(`Querying metrics: ${query} over ${window}`);
  
  // Simulate API call to metrics backend
  // Return mock data for demonstration
  switch (query) {
    case 'api_request_duration_seconds':
      // Return mock latency data (in seconds)
      return {
        status: 'success',
        data: {
          result: [{
            values: Array.from({length: 60}, (_, i) => [Date.now()/1000 - (60-i)*10, (Math.random() * 0.2 + 0.1).toString()])
          }]
        }
      };
    
    case 'api_request_errors_total':
      // Return mock error data
      return {
        status: 'success',
        data: {
          result: [{
            values: Array.from({length: 60}, (_, i) => [Date.now()/1000 - (60-i)*10, Math.floor(Math.random() * 5).toString()])
          }]
        }
      };
    
    case 'api_requests_total':
      // Return mock request count data
      return {
        status: 'success',
        data: {
          result: [{
            values: Array.from({length: 60}, (_, i) => [Date.now()/1000 - (60-i)*10, (500 + Math.floor(Math.random() * 100)).toString()])
          }]
        }
      };
    
    default:
      return { status: 'error', error: 'Unknown query' };
  }
}

// Calculate percentiles from time series data
function calculatePercentiles(values, percentiles) {
  if (!values || values.length === 0) {
    return {};
  }
  
  // Convert string values to numbers and sort
  const sortedValues = values.map(v => parseFloat(v[1])).sort((a, b) => a - b);
  
  const results = {};
  percentiles.forEach(p => {
    const index = Math.floor((p / 100) * (sortedValues.length - 1));
    results[`p${p}`] = sortedValues[index] || 0;
  });
  
  return results;
}

// Calculate error rate
function calculateErrorRate(errors, total) {
  if (!errors || !total || total.length === 0) {
    return 0;
  }
  
  // Sum up the values
  const errorSum = errors.reduce((sum, v) => sum + parseFloat(v[1]), 0);
  const totalSum = total.reduce((sum, v) => sum + parseFloat(v[1]), 0);
  
  return totalSum > 0 ? errorSum / totalSum : 0;
}

function validateSLO(config) {
  console.log(`Validating SLO over ${config.window} window...`);
  
  try {
    // Query API latency metrics
    const latencyData = queryMetrics('api_request_duration_seconds', config.window);
    if (latencyData.status !== 'success') {
      throw new Error(`Failed to query latency metrics: ${latencyData.error}`);
    }
    
    // Query error metrics
    const errorData = queryMetrics('api_request_errors_total', config.window);
    if (errorData.status !== 'success') {
      throw new Error(`Failed to query error metrics: ${errorData.error}`);
    }
    
    // Query total request metrics
    const requestData = queryMetrics('api_requests_total', config.window);
    if (requestData.status !== 'success') {
      throw new Error(`Failed to query request metrics: ${requestData.error}`);
    }
    
    // Extract values
    const latencyValues = latencyData.data.result[0]?.values || [];
    const errorValues = errorData.data.result[0]?.values || [];
    const requestValues = requestData.data.result[0]?.values || [];
    
    // Check if we have enough samples
    if (latencyValues.length < config.minSamples) {
      throw new Error(`Insufficient samples: ${latencyValues.length} < ${config.minSamples}`);
    }
    
    // Calculate percentiles
    const percentiles = calculatePercentiles(latencyValues, [95, 99]);
    const p95LatencyMs = percentiles.p95 * 1000; // Convert to milliseconds
    const p99LatencyMs = percentiles.p99 * 1000; // Convert to milliseconds
    
    // Calculate error rate
    const errorRate = calculateErrorRate(errorValues, requestValues);
    
    console.log(`Calculated metrics:`);
    console.log(`  P95 Latency: ${p95LatencyMs.toFixed(2)}ms`);
    console.log(`  P99 Latency: ${p99LatencyMs.toFixed(2)}ms`);
    console.log(`  Error Rate: ${(errorRate * 100).toFixed(4)}%`);
    console.log(`  Sample Count: ${latencyValues.length}`);
    
    // Validate against thresholds
    const violations = [];
    
    if (p95LatencyMs > config.apiLatencyP95) {
      violations.push({
        type: 'LATENCY_P95',
        message: `P95 latency ${p95LatencyMs.toFixed(2)}ms exceeds threshold ${config.apiLatencyP95}ms`,
        value: p95LatencyMs,
        threshold: config.apiLatencyP95
      });
    }
    
    if (p99LatencyMs > config.apiLatencyP99) {
      violations.push({
        type: 'LATENCY_P99',
        message: `P99 latency ${p99LatencyMs.toFixed(2)}ms exceeds threshold ${config.apiLatencyP99}ms`,
        value: p99LatencyMs,
        threshold: config.apiLatencyP99
      });
    }
    
    if (errorRate > config.errorRateThreshold) {
      violations.push({
        type: 'ERROR_RATE',
        message: `Error rate ${(errorRate * 100).toFixed(4)}% exceeds threshold ${(config.errorRateThreshold * 100).toFixed(4)}%`,
        value: errorRate,
        threshold: config.errorRateThreshold
      });
    }
    
    return {
      valid: violations.length === 0,
      violations,
      metrics: {
        p95LatencyMs,
        p99LatencyMs,
        errorRate,
        sampleCount: latencyValues.length
      }
    };
  } catch (error) {
    console.error('SLO validation failed:', error.message);
    return {
      valid: false,
      violations: [{
        type: 'VALIDATION_ERROR',
        message: `SLO validation failed: ${error.message}`,
        error: error.message
      }],
      metrics: null
    };
  }
}

function main() {
  const config = parseArgs();
  console.log('Running SLO validation with config:', config);
  
  const result = validateSLO(config);
  
  // Output results in GitHub Actions format
  console.log(`\n# SLO Validation Results`);
  console.log(`valid=${result.valid}`);
  console.log(`violations=${result.violations.length}`);
  console.log(`sample_count=${result.metrics?.sampleCount || 0}`);
  
  if (result.metrics) {
    console.log(`p95_latency_ms=${result.metrics.p95LatencyMs}`);
    console.log(`p99_latency_ms=${result.metrics.p99LatencyMs}`);
    console.log(`error_rate=${result.metrics.errorRate}`);
  }
  
  // Output violations
  if (result.violations.length > 0) {
    console.log(`\n# Violations Detected (${result.violations.length})`);
    result.violations.forEach((violation, index) => {
      console.log(`violation_${index}_type=${violation.type}`);
      console.log(`violation_${index}_message=${violation.message}`);
      console.log(`violation_${index}_value=${violation.value || 'N/A'}`);
      console.log(`violation_${index}_threshold=${violation.threshold || 'N/A'}`);
    });
  }
  
  // Determine exit code
  if (!result.valid) {
    console.log('\n❌ SLO validation FAILED - Release should NOT proceed');
    process.exit(1);
  } else {
    console.log('\n✅ SLO validation PASSED - Release can proceed');
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
  console.error('SLO validation failed:', error);
  process.exit(1);
});