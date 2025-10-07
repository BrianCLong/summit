#!/usr/bin/env node

// scripts/probes/decision.mjs
// Makes promotion/rollback decisions based on canary validation results
// Evaluates SLO compliance, error budgets, and policy rules

import fs from 'fs';
import { execSync } from 'child_process';

// Default policy configuration
const DEFAULT_POLICY = {
  // SLO thresholds
  maxApiLatencyP95: 350,     // ms
  maxApiLatencyP99: 900,     // ms
  maxErrorRate: 0.002,        // 0.2%
  
  // Error budget consumption
  maxErrorBudgetConsumption: 0.8,  // 80% of budget consumed
  
  // Stability requirements
  minCanaryDuration: "10m",     // Minimum time to observe canary
  minSampleSize: 1000,          // Minimum samples for statistical significance
  
  // Decision weights
  sloViolationWeight: 10,
  errorBudgetWeight: 5,
  stabilityWeight: 2,
  
  // Decision thresholds
  promoteThreshold: 70,      // Score >= 70 promotes
  rollbackThreshold: 30     // Score <= 30 rolls back
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (key && value !== undefined) {
        options[key] = value;
      }
    }
  });
  
  return options;
}

// Load policy from file or use defaults
function loadPolicy(policyFile) {
  if (!policyFile || !fs.existsSync(policyFile)) {
    console.log('Using default policy configuration');
    return DEFAULT_POLICY;
  }
  
  try {
    const policyContent = fs.readFileSync(policyFile, 'utf8');
    const policy = JSON.parse(policyContent);
    console.log(`Loaded policy from ${policyFile}`);
    return { ...DEFAULT_POLICY, ...policy };
  } catch (error) {
    console.error(`Failed to load policy from ${policyFile}:`, error.message);
    console.log('Using default policy configuration');
    return DEFAULT_POLICY;
  }
}

// Mock function to simulate querying metrics
// In a real implementation, this would connect to your metrics backend
function queryMetrics(metricName, window) {
  console.log(`Querying ${metricName} over ${window} window...`);
  
  // Simulate different outcomes based on metric name
  switch (metricName) {
    case 'api_latency_p95':
      // Return mock latency data (in milliseconds)
      return {
        value: Math.random() * 400 + 200, // Between 200-600ms
        timestamp: Date.now()
      };
    
    case 'api_latency_p99':
      // Return mock latency data (in milliseconds)
      return {
        value: Math.random() * 1000 + 600, // Between 600-1600ms
        timestamp: Date.now()
      };
    
    case 'api_error_rate':
      // Return mock error rate (percentage)
      return {
        value: Math.random() * 0.005, // Between 0-0.5%
        timestamp: Date.now()
      };
    
    case 'error_budget_consumption':
      // Return mock error budget consumption (percentage)
      return {
        value: Math.random() * 0.9, // Between 0-90%
        timestamp: Date.now()
      };
    
    case 'canary_duration':
      // Return mock canary duration (minutes)
      return {
        value: Math.floor(Math.random() * 20) + 5, // Between 5-25 minutes
        timestamp: Date.now()
      };
    
    case 'sample_size':
      // Return mock sample size
      return {
        value: Math.floor(Math.random() * 5000) + 500, // Between 500-5500 samples
        timestamp: Date.now()
      };
    
    default:
      return {
        value: 0,
        timestamp: Date.now()
      };
  }
}

// Evaluate SLO compliance
function evaluateSLOs(policy) {
  console.log('Evaluating SLO compliance...');
  
  const metrics = {
    p95Latency: queryMetrics('api_latency_p95', policy.minCanaryDuration),
    p99Latency: queryMetrics('api_latency_p99', policy.minCanaryDuration),
    errorRate: queryMetrics('api_error_rate', policy.minCanaryDuration)
  };
  
  const violations = [];
  
  // Check P95 latency
  if (metrics.p95Latency.value > policy.maxApiLatencyP95) {
    violations.push({
      type: 'P95_LATENCY_VIOLATION',
      message: `P95 latency ${metrics.p95Latency.value.toFixed(2)}ms exceeds SLO ${policy.maxApiLatencyP95}ms`,
      value: metrics.p95Latency.value,
      threshold: policy.maxApiLatencyP95,
      weight: policy.sloViolationWeight
    });
  }
  
  // Check P99 latency
  if (metrics.p99Latency.value > policy.maxApiLatencyP99) {
    violations.push({
      type: 'P99_LATENCY_VIOLATION',
      message: `P99 latency ${metrics.p99Latency.value.toFixed(2)}ms exceeds SLO ${policy.maxApiLatencyP99}ms`,
      value: metrics.p99Latency.value,
      threshold: policy.maxApiLatencyP99,
      weight: policy.sloViolationWeight
    });
  }
  
  // Check error rate
  if (metrics.errorRate.value > policy.maxErrorRate) {
    violations.push({
      type: 'ERROR_RATE_VIOLATION',
      message: `Error rate ${(metrics.errorRate.value * 100).toFixed(4)}% exceeds SLO ${(policy.maxErrorRate * 100).toFixed(4)}%`,
      value: metrics.errorRate.value,
      threshold: policy.maxErrorRate,
      weight: policy.sloViolationWeight
    });
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    metrics
  };
}

// Evaluate error budget consumption
function evaluateErrorBudget(policy) {
  console.log('Evaluating error budget consumption...');
  
  const consumption = queryMetrics('error_budget_consumption', '1h');
  
  const compliant = consumption.value <= policy.maxErrorBudgetConsumption;
  
  if (!compliant) {
    return {
      compliant: false,
      violations: [{
        type: 'ERROR_BUDGET_EXCEEDED',
        message: `Error budget consumption ${(consumption.value * 100).toFixed(2)}% exceeds limit ${(policy.maxErrorBudgetConsumption * 100).toFixed(2)}%`,
        value: consumption.value,
        threshold: policy.maxErrorBudgetConsumption,
        weight: policy.errorBudgetWeight
      }],
      metrics: consumption
    };
  }
  
  return {
    compliant: true,
    violations: [],
    metrics: consumption
  };
}

// Evaluate stability requirements
function evaluateStability(policy) {
  console.log('Evaluating stability requirements...');
  
  const duration = queryMetrics('canary_duration', 'current');
  const sampleSize = queryMetrics('sample_size', 'current');
  
  const violations = [];
  
  // Check minimum duration
  if (duration.value < parseInt(policy.minCanaryDuration)) {
    violations.push({
      type: 'MIN_DURATION_NOT_MET',
      message: `Canary duration ${duration.value}min below minimum ${policy.minCanaryDuration}`,
      value: duration.value,
      threshold: parseInt(policy.minCanaryDuration),
      weight: policy.stabilityWeight
    });
  }
  
  // Check minimum sample size
  if (sampleSize.value < policy.minSampleSize) {
    violations.push({
      type: 'MIN_SAMPLE_SIZE_NOT_MET',
      message: `Sample size ${sampleSize.value} below minimum ${policy.minSampleSize}`,
      value: sampleSize.value,
      threshold: policy.minSampleSize,
      weight: policy.stabilityWeight
    });
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    metrics: {
      duration: duration,
      sampleSize: sampleSize
    }
  };
}

// Calculate decision score
function calculateScore(evaluations, policy) {
  console.log('Calculating decision score...');
  
  let totalScore = 100; // Start with perfect score
  let totalWeight = 0;
  
  evaluations.forEach(evaluation => {
    if (evaluation.violations && evaluation.violations.length > 0) {
      evaluation.violations.forEach(violation => {
        const weight = violation.weight || 1;
        totalScore -= weight * 10; // Subtract 10 points per violation multiplied by weight
        totalWeight += weight;
      });
    }
  });
  
  // Normalize score
  const normalizedScore = Math.max(0, totalScore);
  
  console.log(`Raw score: ${totalScore}, Normalized score: ${normalizedScore}`);
  
  return normalizedScore;
}

// Make final decision
function makeDecision(score, policy) {
  console.log(`Making decision with score: ${score}`);
  
  if (score >= policy.promoteThreshold) {
    return {
      decision: 'promote',
      reason: `Score ${score} >= promote threshold ${policy.promoteThreshold}`,
      confidence: (score - policy.promoteThreshold) / (100 - policy.promoteThreshold)
    };
  } else if (score <= policy.rollbackThreshold) {
    return {
      decision: 'rollback',
      reason: `Score ${score} <= rollback threshold ${policy.rollbackThreshold}`,
      confidence: (policy.rollbackThreshold - score) / policy.rollbackThreshold
    };
  } else {
    return {
      decision: 'hold',
      reason: `Score ${score} is between rollback (${policy.rollbackThreshold}) and promote (${policy.promoteThreshold}) thresholds`,
      confidence: 0.5
    };
  }
}

// Main function
function main() {
  const options = parseArgs();
  const policy = loadPolicy(options.policy);
  
  console.log('Running canary decision analysis with policy:', policy);
  
  // Perform evaluations
  const sloEvaluation = evaluateSLOs(policy);
  const budgetEvaluation = evaluateErrorBudget(policy);
  const stabilityEvaluation = evaluateStability(policy);
  
  const evaluations = [sloEvaluation, budgetEvaluation, stabilityEvaluation];
  
  // Calculate overall score
  const score = calculateScore(evaluations, policy);
  
  // Make final decision
  const decision = makeDecision(score, policy);
  
  // Output results
  console.log('\n# Canary Decision Analysis Results');
  console.log(`decision=${decision.decision}`);
  console.log(`reason=${decision.reason}`);
  console.log(`confidence=${decision.confidence}`);
  console.log(`score=${score}`);
  console.log(`promote_threshold=${policy.promoteThreshold}`);
  console.log(`rollback_threshold=${policy.rollbackThreshold}`);
  
  // Output individual evaluation results
  evaluations.forEach((evaluation, index) => {
    console.log(`\n# Evaluation ${index + 1} Results`);
    console.log(`compliant=${evaluation.compliant}`);
    console.log(`violations=${evaluation.violations.length}`);
    
    if (evaluation.violations.length > 0) {
      evaluation.violations.forEach((violation, vIndex) => {
        console.log(`violation_${vIndex}_type=${violation.type}`);
        console.log(`violation_${vIndex}_message=${violation.message}`);
        console.log(`violation_${vIndex}_value=${violation.value}`);
        console.log(`violation_${vIndex}_threshold=${violation.threshold}`);
        console.log(`violation_${vIndex}_weight=${violation.weight}`);
      });
    }
  });
  
  // Output metrics
  console.log('\n# Metrics Summary');
  console.log(`p95_latency_ms=${sloEvaluation.metrics.p95Latency.value}`);
  console.log(`p99_latency_ms=${sloEvaluation.metrics.p99Latency.value}`);
  console.log(`error_rate=${sloEvaluation.metrics.errorRate.value}`);
  console.log(`error_budget_consumption=${budgetEvaluation.metrics.value}`);
  console.log(`canary_duration_min=${stabilityEvaluation.metrics.duration.value}`);
  console.log(`sample_size=${stabilityEvaluation.metrics.sampleSize.value}`);
  
  // Print human-readable summary
  console.log('\n# Decision Summary');
  switch (decision.decision) {
    case 'promote':
      console.log('✅ PROMOTE - Canary shows strong performance and stability');
      break;
    case 'rollback':
      console.log('❌ ROLLBACK - Significant issues detected in canary deployment');
      break;
    case 'hold':
      console.log('⏸️ HOLD - Insufficient evidence to promote or rollback, continue monitoring');
      break;
  }
  console.log(`Reason: ${decision.reason}`);
  console.log(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
  
  // Output decision to stdout for piping
  console.log(decision.decision);
  
  return decision.decision;
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
  console.error('Decision analysis failed:', error);
  process.exit(1);
});