# Privacy-Preserving Machine Learning Guide

## Overview

Summit's Privacy-Preserving ML platform provides enterprise-grade federated learning, differential privacy, and homomorphic encryption capabilities for intelligence operations requiring strict privacy guarantees.

## Architecture

The platform consists of five core packages and two services:

### Core Packages

1. **@intelgraph/federated-learning** - Federated learning orchestration
2. **@intelgraph/differential-privacy** - Privacy budget management
3. **@intelgraph/homomorphic-encryption** - Secure computation
4. **@intelgraph/secure-aggregation** - Byzantine-robust protocols
5. **@intelgraph/privacy-preserving-ml** - Private training and compliance

### Services

1. **federated-service** (Port 3100) - Federated learning API
2. **privacy-service** (Port 3101) - Privacy analysis and enforcement

## Quick Start

### 1. Initialize Federated Learning Session

```typescript
import { FederatedOrchestrator } from '@intelgraph/federated-learning';

const orchestrator = new FederatedOrchestrator();

const config = {
  minClientsPerRound: 5,
  maxClientsPerRound: 10,
  clientFraction: 0.3,
  numRounds: 100,
  learningRate: 0.01,
  batchSize: 32,
  localEpochs: 5,
  aggregationStrategy: 'fedavg',
  secureAggregation: true,
  differentialPrivacy: true,
  privacyBudget: {
    epsilon: 1.0,
    delta: 1e-5,
  },
  timeout: 60000,
};

const clients = [
  { clientId: 'client-1', dataSize: 1000, computeCapability: 1.0, bandwidth: 100, availability: 0.9, isReliable: true },
  { clientId: 'client-2', dataSize: 1500, computeCapability: 0.8, bandwidth: 80, availability: 0.8, isReliable: true },
  // ... more clients
];

const initialWeights = {
  layer1: [0.1, 0.2, 0.3],
  layer2: [[0.4, 0.5], [0.6, 0.7]],
};

const sessionId = await orchestrator.initializeSession(config, clients, initialWeights);
```

### 2. Run Training Round

```typescript
// Start a new round
const round = await orchestrator.startRound(sessionId);

// Clients train locally and submit updates
const update = {
  clientId: 'client-1',
  roundNumber: 1,
  weights: updatedWeights,
  numSamples: 1000,
  loss: 0.5,
  accuracy: 0.85,
  timestamp: new Date(),
};

await orchestrator.submitClientUpdate(sessionId, update);

// Aggregate updates
const result = await orchestrator.aggregateRound(sessionId, [update1, update2, ...]);
```

### 3. Differential Privacy

```typescript
import { PrivacyBudgetManager, GaussianMechanism } from '@intelgraph/differential-privacy';

const budgetManager = new PrivacyBudgetManager();
const gaussian = new GaussianMechanism();

// Initialize budget
budgetManager.initializeBudget('budget-1', 1.0, 1e-5);

// Add noise to query result
const sensitiveValue = 42;
const noisyValue = gaussian.addNoise(sensitiveValue, {
  mechanism: 'gaussian',
  sensitivity: 1.0,
  epsilon: 0.1,
  delta: 1e-5,
});

// Track budget consumption
budgetManager.consumeBudget('budget-1', 0.1, 1e-5, 'query-1');
```

### 4. Homomorphic Encryption

```typescript
import { PaillierScheme } from '@intelgraph/homomorphic-encryption';

const paillier = new PaillierScheme();

// Generate keys
const keyPair = paillier.generateKeyPair(2048);

// Encrypt
const plaintext = 42;
const ciphertext = paillier.encrypt(plaintext, keyPair.publicKey);

// Homomorphic addition
const ciphertext1 = paillier.encrypt(10, keyPair.publicKey);
const ciphertext2 = paillier.encrypt(32, keyPair.publicKey);
const sum = paillier.add(ciphertext1, ciphertext2); // Encrypted 42

// Decrypt
const decrypted = paillier.decrypt(sum, keyPair.privateKey); // 42
```

## Advanced Features

### Secure Aggregation with Byzantine Robustness

```typescript
import { ByzantineRobustAggregator } from '@intelgraph/secure-aggregation';

const aggregator = new ByzantineRobustAggregator();

// Krum aggregation (robust to Byzantine failures)
const updates = [
  [1.0, 2.0, 3.0],
  [1.1, 2.1, 3.1],
  [1.2, 2.2, 3.2],
  [100.0, 200.0, 300.0], // Byzantine client
];

const robustAggregate = aggregator.krum(updates, 1); // Filters out Byzantine update
```

### Private Gradient Descent

```typescript
import { PrivateGradientDescent } from '@intelgraph/privacy-preserving-ml';

const privateSGD = new PrivateGradientDescent();

const config = {
  learningRate: 0.01,
  clippingNorm: 1.0,
  noiseMultiplier: 1.1,
  batchSize: 256,
  epochs: 10,
  targetEpsilon: 1.0,
  targetDelta: 1e-5,
};

const gradients = [[0.5, 0.3, 0.2], [0.4, 0.6, 0.1]];
const privateGradient = privateSGD.privateSGDStep(gradients, config);
```

### Synthetic Data Generation

```typescript
import { SyntheticDataGenerator } from '@intelgraph/privacy-preserving-ml';

const generator = new SyntheticDataGenerator();

const trainingData = [
  [1.0, 2.0, 3.0],
  [1.5, 2.5, 3.5],
  // ... more data
];

const syntheticData = generator.generateSynthetic(
  trainingData,
  1.0, // epsilon
  1000  // number of synthetic samples
);
```

### Attack Detection

```typescript
import { AttackDetector } from '@intelgraph/privacy-preserving-ml';

const detector = new AttackDetector();

// Detect membership inference
const result = detector.detectMembershipInference(
  model,
  trainingLosses,
  testLosses,
  0.3
);

if (result.detected) {
  console.log(`⚠️ Attack detected: ${result.details}`);
}
```

## REST API Usage

### Federated Service API

```bash
# Initialize session
curl -X POST http://localhost:3100/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"config": {...}, "clients": [...], "initialWeights": {...}}'

# Start round
curl -X POST http://localhost:3100/api/sessions/{sessionId}/rounds

# Submit update
curl -X POST http://localhost:3100/api/sessions/{sessionId}/updates \
  -H "Content-Type: application/json" \
  -d '{"clientId": "client-1", "roundNumber": 1, ...}'

# Get metrics
curl http://localhost:3100/api/sessions/{sessionId}/metrics
```

### Privacy Service API

```bash
# Initialize budget
curl -X POST http://localhost:3101/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"budgetId": "budget-1", "epsilon": 1.0, "delta": 1e-5}'

# Get budget status
curl http://localhost:3101/api/budgets/budget-1

# Detect attacks
curl -X POST http://localhost:3101/api/attacks/membership-inference \
  -H "Content-Type: application/json" \
  -d '{"model": {...}, "trainingLosses": [...], "testLosses": [...]}'

# Generate synthetic data
curl -X POST http://localhost:3101/api/synthetic/generate \
  -H "Content-Type: application/json" \
  -d '{"data": [[...]], "epsilon": 1.0, "numSamples": 1000}'
```

## Best Practices

### 1. Privacy Budget Management

- Always initialize privacy budgets before operations
- Monitor budget consumption in real-time
- Use advanced composition for tighter bounds
- Stop operations when budget is exhausted

### 2. Federated Learning

- Select appropriate number of clients per round
- Use secure aggregation for sensitive data
- Implement Byzantine-robust aggregation for adversarial settings
- Monitor convergence and adjust hyperparameters

### 3. Differential Privacy

- Choose ε based on sensitivity of data (lower is more private)
- For most applications, ε ∈ [0.1, 10] is reasonable
- Set δ < 1/n where n is dataset size
- Use moment accountant for composition

### 4. Security

- Rotate encryption keys regularly
- Implement secure key management
- Validate all client updates
- Monitor for privacy attacks

## Performance Optimization

### Model Compression

```typescript
import { ModelCompressor } from '@intelgraph/federated-learning';

const compressor = new ModelCompressor();

const compressed = compressor.compress(weights, {
  method: 'quantization',
  compressionRatio: 0.5,
  parameters: { bits: 8 },
});
```

### Asynchronous Federated Learning

```typescript
const config = {
  // ... other config
  asyncConfig: {
    enabled: true,
    staleness: 5,
    bufferSize: 10,
    mixingHyperparameter: 0.9,
  },
};
```

## Troubleshooting

### High Privacy Loss

- Reduce number of operations
- Increase privacy budget
- Use stronger noise mechanisms
- Implement privacy amplification

### Slow Convergence

- Increase number of clients per round
- Adjust learning rate
- Use better client selection strategies
- Implement model compression

### Byzantine Failures

- Enable Byzantine-robust aggregation
- Increase redundancy
- Monitor client behavior
- Implement reputation systems

## References

- [Federated Learning: Collaborative Machine Learning without Centralized Training Data](https://ai.googleblog.com/2017/04/federated-learning-collaborative.html)
- [Deep Learning with Differential Privacy](https://arxiv.org/abs/1607.00133)
- [Advances and Open Problems in Federated Learning](https://arxiv.org/abs/1912.04977)
