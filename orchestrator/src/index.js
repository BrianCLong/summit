// orchestrator/src/index.js
// IntelGraph Orchestrator with Fastlane and Friction Alerts

const express = require('express');
const app = express();
const port = process.env.PORT || 8000;

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    fastlaneEnabled: process.env.FASTLANE_ENABLED === 'true',
    otelEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'not set'
  });
});

// Fastlane eligibility check endpoint
app.get('/fastlane/eligible', (req, res) => {
  // In a real implementation, this would check:
  // - Deterministic cache keys
  // - No secrets in logs/artifacts
  // - Hermetic build steps
  // - Resource availability
  
  const isEligible = Math.random() > 0.2; // 80% chance of being eligible for demo purposes
  
  res.status(200).json({
    eligible: isEligible,
    reason: isEligible ? 'Job meets fastlane criteria' : 'Job does not meet fastlane criteria',
    timestamp: new Date().toISOString()
  });
});

// Friction alert endpoint
app.get('/friction/alert', (req, res) => {
  // In a real implementation, this would:
  // - Check for signs of friction (slow builds, test flakes, etc.)
  // - Generate alerts with evidence bundles
  // - Route alerts to appropriate owners
  
  const hasFriction = Math.random() > 0.7; // 30% chance of detecting friction for demo purposes
  
  if (hasFriction) {
    res.status(200).json({
      alert: true,
      type: 'BUILD_SLOW',
      severity: 'warning',
      message: 'Detected slow build times exceeding threshold',
      evidence: {
        buildTimeMs: Math.floor(Math.random() * 10000) + 5000, // 5-15 seconds
        thresholdMs: 5000,
        sampleCount: Math.floor(Math.random() * 100) + 50
      },
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(200).json({
      alert: false,
      message: 'No friction detected',
      timestamp: new Date().toISOString()
    });
  }
});

// SLO metrics endpoint
app.get('/metrics/slo', (req, res) => {
  // In a real implementation, this would:
  // - Query actual SLO metrics from Prometheus/OpenTelemetry
  // - Compare against defined thresholds
  // - Return compliance status
  
  res.status(200).json({
    api: {
      p95LatencyMs: Math.floor(Math.random() * 200) + 150, // 150-350ms
      p99LatencyMs: Math.floor(Math.random() * 400) + 500, // 500-900ms
      errorRate: Math.random() * 0.002, // 0-0.2%
      threshold: {
        p95Ms: 350,
        p99Ms: 900,
        errorRate: 0.002
      }
    },
    write: {
      p95LatencyMs: Math.floor(Math.random() * 300) + 400, // 400-700ms
      p99LatencyMs: Math.floor(Math.random() * 600) + 1000, // 1000-1600ms
      threshold: {
        p95Ms: 700,
        p99Ms: 1500
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(port, () => {
  console.log(`IntelGraph Orchestrator listening on port ${port}`);
  console.log(`Fastlane enabled: ${process.env.FASTLANE_ENABLED || 'false'}`);
  console.log(`OTEL endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'not set'}`);
});