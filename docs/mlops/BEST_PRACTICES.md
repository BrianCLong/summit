# MLOps Best Practices

## Training Best Practices

### 1. Experiment Tracking

Always track your experiments comprehensively:

```typescript
const config: TrainingConfig = {
  runId: generateUniqueId(),
  modelName: 'my-model',
  // ... other config
  experimentTags: [
    'production',
    'experiment-name',
    `user-${username}`,
    `date-${date}`,
  ],
  metadata: {
    hypothesis: 'Testing new architecture',
    datasetVersion: '2.0.0',
    previousBestScore: 0.89,
  },
};
```

### 2. Resource Management

Optimize resource allocation:

```typescript
const resources = {
  // Request slightly less than limits for stability
  gpus: 4,
  cpus: 15,  // Not 16 - leave room for system
  memory: '30Gi',  // Not 32Gi - buffer for overhead

  // Use node selectors for specific hardware
  nodeSelector: {
    'node.kubernetes.io/instance-type': 'p3.8xlarge',
    'nvidia.com/gpu.product': 'Tesla-V100-SXM2-16GB',
  },
};
```

### 3. Checkpointing Strategy

Implement robust checkpointing:

```typescript
const checkpoint = {
  enabled: true,
  frequency: 5,  // Every 5 epochs
  keepBest: 3,   // Keep top 3 checkpoints
  savePath: 's3://checkpoints/{runId}',
  saveOptimizer: true,  // For resume capability
};
```

### 4. Early Stopping

Prevent overfitting and save resources:

```typescript
const earlyStopping = {
  enabled: true,
  metric: 'val_f1_score',
  patience: 10,
  minDelta: 0.001,
  mode: 'max',  // Maximize F1 score
};
```

## Feature Store Best Practices

### 1. Feature Naming Convention

Use clear, consistent naming:

```typescript
// Good
'user_transaction_count_7d'
'merchant_fraud_rate_30d'
'location_risk_score'

// Bad
'feat1'
'tc'
'loc_score'
```

### 2. Feature Versioning

Version features properly:

```typescript
const feature = {
  name: 'transaction_amount_normalized',
  version: 2,  // Incremented when logic changes
  transformation: {
    type: 'standardization',
    config: {
      mean: 150.5,
      stddev: 50.2,
      updatedAt: '2024-01-15',
    },
  },
};
```

### 3. Point-in-Time Correctness

Always use point-in-time queries for training:

```typescript
// CORRECT - Point-in-time features
const trainingData = await featureStore.pointInTimeQuery({
  entityIds: userIds,
  featureNames: featureList,
  timestamp: labelTimestamp,  // When label was created
});

// WRONG - Current features (introduces label leakage)
const wrongData = await featureStore.batchRead(userIds, featureIds);
```

### 4. Feature Monitoring

Monitor feature quality:

```typescript
// Set up constraints
const constraints = [
  {
    type: 'range',
    config: { min: 0, max: 1000000 },
  },
  {
    type: 'not-null',
    config: {},
  },
  {
    type: 'freshness',
    config: { maxAge: 3600 },  // 1 hour
  },
];

// Compute statistics regularly
await featureStore.computeStatistics(featureId);
```

## Model Deployment Best Practices

### 1. Deployment Strategy Selection

Choose the right strategy:

```typescript
// For critical production models - Blue-Green
const criticalDeployment = {
  strategy: 'blue-green',
  strategyConfig: {
    testTrafficPercentage: 5,
    validationDuration: 3600,  // 1 hour validation
  },
};

// For gradual rollout - Canary
const canaryDeployment = {
  strategy: 'canary',
  strategyConfig: {
    canaryPercentage: 5,
    incrementPercentage: 10,
    incrementInterval: 1800,  // 30 minutes
    rollbackOnError: true,
    errorThreshold: 0.01,
  },
};

// For testing - Shadow
const shadowDeployment = {
  strategy: 'shadow',
  strategyConfig: {
    duration: 86400,  // 24 hours
    sampleRate: 1.0,  // 100% of traffic
  },
};
```

### 2. Resource Sizing

Right-size your deployments:

```typescript
const resources = {
  // Start conservative
  replicas: 2,
  minReplicas: 2,
  maxReplicas: 20,

  // Based on load testing
  cpuRequest: '500m',
  cpuLimit: '2000m',
  memoryRequest: '1Gi',
  memoryLimit: '4Gi',

  // Enable autoscaling
  autoscaling: {
    enabled: true,
    metric: 'requests-per-second',
    targetValue: 100,  // Scale at 100 RPS per replica
  },
};
```

### 3. Health Checks

Configure proper health checks:

```typescript
const healthCheck = {
  enabled: true,
  path: '/health',
  interval: 30,
  timeout: 5,
  successThreshold: 1,
  failureThreshold: 3,  // Allow temporary failures
  initialDelay: 60,  // Wait for model loading
};
```

### 4. Model Optimization

Optimize models for production:

```typescript
const optimization = {
  quantization: true,  // Reduce model size
  pruning: false,      // Only if accuracy permits
  batchOptimization: true,
  accelerator: 'gpu',

  // Framework-specific
  onnxOptimization: true,
  tensorRTOptimization: true,
};
```

## Monitoring Best Practices

### 1. Drift Detection Configuration

Set appropriate thresholds:

```typescript
const driftConfig = {
  enabled: true,
  method: 'kolmogorov-smirnov',

  // Feature drift
  featureDriftThreshold: 0.05,

  // Prediction drift
  predictionDriftThreshold: 0.10,

  // Concept drift (performance degradation)
  conceptDriftThreshold: 0.05,

  windowSize: 1000,  // Samples
  comparisonWindow: 10000,  // Reference window
};
```

### 2. Alert Configuration

Set up multi-level alerts:

```typescript
const alerts = [
  {
    condition: 'drift_detected',
    threshold: 0.05,
    severity: 'info',
    channels: ['slack'],
  },
  {
    condition: 'drift_detected',
    threshold: 0.15,
    severity: 'warning',
    channels: ['slack', 'pagerduty'],
  },
  {
    condition: 'error_rate',
    threshold: 0.01,
    severity: 'critical',
    channels: ['pagerduty', 'email'],
  },
  {
    condition: 'latency_p99',
    threshold: 1000,  // ms
    severity: 'warning',
    channels: ['slack'],
  },
];
```

### 3. Performance Metrics

Track comprehensive metrics:

```typescript
const metricsToTrack = [
  // Latency
  'latency_p50',
  'latency_p95',
  'latency_p99',
  'latency_max',

  // Throughput
  'requests_per_second',
  'batch_size_avg',

  // Errors
  'error_rate',
  'timeout_rate',

  // Resources
  'cpu_usage',
  'memory_usage',
  'gpu_utilization',

  // Business metrics
  'prediction_distribution',
  'confidence_avg',
];
```

### 4. Automated Retraining

Set up retraining triggers:

```typescript
const retrainingTriggers = [
  {
    type: 'performance-degradation',
    metric: 'f1_score',
    threshold: 0.85,  // Retrain if F1 drops below 0.85
    windowSize: 10000,
  },
  {
    type: 'data-drift',
    severity: 'high',
    consecutiveDetections: 3,
  },
  {
    type: 'scheduled',
    schedule: '0 0 * * 0',  // Weekly on Sunday
  },
  {
    type: 'data-volume',
    newSamplesThreshold: 100000,
  },
];
```

## Governance Best Practices

### 1. Model Documentation

Document models thoroughly:

```typescript
const modelDocumentation = {
  modelCard: {
    intendedUse: 'Detect fraudulent transactions in real-time',
    trainingData: {
      source: 'Production transactions 2023-2024',
      size: '10M samples',
      labelDistribution: { fraud: '0.5%', legitimate: '99.5%' },
    },
    performanceMetrics: {
      precision: 0.93,
      recall: 0.94,
      f1Score: 0.935,
      auc: 0.98,
    },
    limitations: [
      'May underperform on novel fraud patterns',
      'Requires feature values within training range',
    ],
    ethicalConsiderations: [
      'Potential bias against certain merchant categories',
      'Privacy: uses anonymized transaction data only',
    ],
  },
};
```

### 2. Access Control

Implement proper access control:

```typescript
const accessControl = {
  owners: ['ml-team@company.com'],
  viewers: ['data-team@company.com', 'analytics-team@company.com'],
  approvers: ['ml-lead@company.com', 'compliance@company.com'],

  // Environment restrictions
  production: {
    deployers: ['ml-lead@company.com'],
    requiresApproval: true,
    approvalCount: 2,
  },
};
```

### 3. Audit Trails

Maintain comprehensive audit logs:

```typescript
// All actions are logged automatically
const auditLog = [
  {
    timestamp: new Date(),
    action: 'model_deployed',
    actor: 'user@company.com',
    details: {
      modelId: 'fraud-model-123',
      version: '2.0.0',
      environment: 'production',
      strategy: 'canary',
    },
  },
];
```

### 4. Compliance Tracking

Track compliance requirements:

```typescript
const compliance = {
  frameworks: ['GDPR', 'CCPA', 'SOC2'],
  requirements: {
    dataRetention: {
      training: '7 years',
      predictions: '90 days',
      pii: 'anonymized',
    },
    explainability: {
      required: true,
      method: 'shap',
      retentionPeriod: '90 days',
    },
    biasMonitoring: {
      enabled: true,
      protectedAttributes: ['location', 'customer_segment'],
      frequency: 'weekly',
    },
  },
};
```

## Performance Optimization

### 1. Batch Prediction

Use batching for efficiency:

```typescript
// Inefficient - Individual predictions
for (const request of requests) {
  await server.predict(request);
}

// Efficient - Batch prediction
const predictions = await server.batchPredict(requests);
```

### 2. Caching

Implement prediction caching:

```typescript
const cache = {
  enabled: true,
  backend: 'redis',
  ttl: 300,  // 5 minutes
  keyPattern: 'prediction:{modelId}:{inputHash}',
  maxSize: '10GB',
};
```

### 3. Model Compression

Apply model compression techniques:

```typescript
const compressionConfig = {
  // Quantization - 4x size reduction, minimal accuracy loss
  quantization: {
    enabled: true,
    bits: 8,
    calibrationSamples: 1000,
  },

  // Pruning - Remove redundant parameters
  pruning: {
    enabled: true,
    targetSparsity: 0.5,  // 50% sparsity
    method: 'magnitude',
  },

  // Knowledge distillation
  distillation: {
    enabled: false,  // Use for complex models
    teacherModel: 'large-model-v1',
    temperature: 3.0,
  },
};
```

### 4. Load Balancing

Configure effective load balancing:

```typescript
const loadBalancing = {
  algorithm: 'least-connections',
  healthCheckInterval: 10,

  // Sticky sessions for stateful models
  sessionAffinity: {
    enabled: false,
    timeout: 3600,
  },

  // Geographic routing
  geoRouting: {
    enabled: true,
    regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
  },
};
```

## Disaster Recovery

### 1. Backup Strategy

```typescript
const backupConfig = {
  models: {
    frequency: 'daily',
    retention: 90,  // days
    destination: 's3://backups/models',
  },
  registry: {
    frequency: 'hourly',
    retention: 30,
    destination: 's3://backups/registry',
  },
  features: {
    frequency: 'daily',
    retention: 7,
    destination: 's3://backups/features',
  },
};
```

### 2. Rollback Procedures

```typescript
// Quick rollback to previous version
async function rollbackDeployment(deploymentId: string) {
  // 1. Stop new traffic
  await server.updateTrafficSplit([
    { deploymentId, percentage: 0 },
  ]);

  // 2. Rollback
  await server.rollback(deploymentId);

  // 3. Verify health
  const deployment = await server.getDeployment(deploymentId);
  if (deployment.status === 'healthy') {
    // 4. Restore traffic
    await server.updateTrafficSplit([
      { deploymentId, percentage: 100 },
    ]);
  }
}
```

## Testing

### 1. Model Validation

```typescript
// Validate before deployment
const validation = {
  // Performance tests
  minimumMetrics: {
    accuracy: 0.90,
    precision: 0.88,
    recall: 0.85,
  },

  // Bias tests
  fairnessMetrics: {
    disparateImpact: { min: 0.8, max: 1.25 },
    equalOpportunity: { max: 0.1 },
  },

  // Robustness tests
  adversarialTests: {
    enabled: true,
    epsilon: 0.01,
  },
};
```

### 2. Load Testing

```typescript
// Load test before production
const loadTest = {
  duration: 3600,  // 1 hour
  targetRPS: 1000,
  rampUpTime: 300,  // 5 minutes

  assertions: {
    p95Latency: { max: 100 },  // ms
    p99Latency: { max: 500 },
    errorRate: { max: 0.001 },
  },
};
```
