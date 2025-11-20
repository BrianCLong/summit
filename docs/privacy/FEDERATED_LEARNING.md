# Federated Learning Documentation

## Overview

Federated Learning enables training machine learning models across distributed clients without centralizing data. Summit implements state-of-the-art federated learning protocols with security and privacy guarantees.

## Core Concepts

### Federated Averaging (FedAvg)

The baseline algorithm for federated learning:

1. **Server** broadcasts global model to selected clients
2. **Clients** train locally on their data
3. **Clients** send model updates to server
4. **Server** aggregates updates using weighted averaging
5. Repeat until convergence

### Mathematical Formulation

Given K clients with datasets D₁, D₂, ..., Dₖ:

```
Global objective: min F(w) = Σᵢ (nᵢ/n) Fᵢ(w)

where:
- w: model parameters
- nᵢ: size of client i's dataset
- n: total dataset size
- Fᵢ(w): loss on client i's data
```

**FedAvg update rule:**

```
w_{t+1} = Σᵢ (nᵢ/n) w_{t,i}

where w_{t,i} is client i's model after local training
```

## Architecture Components

### 1. Federated Orchestrator

Central coordination engine managing training rounds.

**Key Methods:**
- `initializeSession()` - Start new FL session
- `startRound()` - Begin training round
- `aggregateRound()` - Combine client updates
- `getGlobalWeights()` - Retrieve current model

**Example:**
```typescript
const orchestrator = new FederatedOrchestrator();

const sessionId = await orchestrator.initializeSession(
  config,
  clients,
  initialWeights
);

// Training loop
for (let round = 0; round < config.numRounds; round++) {
  await orchestrator.startRound(sessionId);

  // Clients train and submit updates
  const updates = await collectClientUpdates();

  await orchestrator.aggregateRound(sessionId, updates);

  const metrics = orchestrator.getTrainingMetrics(sessionId);
  console.log(`Round ${round}: Loss = ${metrics.rounds[round].metrics.averageLoss}`);
}
```

### 2. Client Selection

Strategies for selecting clients in each round:

#### Random Selection (Baseline)
```typescript
const selector = new ClientSelector();
const selected = selector.selectClients(
  clients,
  minClients,
  maxClients,
  clientFraction,
  { strategy: 'random' }
);
```

#### Importance-Based Selection
Prioritizes clients with more data or better resources:
```typescript
const selected = selector.selectClients(
  clients,
  minClients,
  maxClients,
  clientFraction,
  {
    strategy: 'importance',
    parameters: {
      dataWeight: 0.5,
      computeWeight: 0.3,
      reliabilityWeight: 0.2,
    },
  }
);
```

#### Fairness-Based Selection
Ensures all clients participate equally over time:
```typescript
const selected = selector.selectClients(
  clients,
  minClients,
  maxClients,
  clientFraction,
  {
    strategy: 'fairness',
    parameters: {
      participationHistory: historyMap,
    },
  }
);
```

### 3. Secure Aggregation

Protect client updates during aggregation using cryptographic protocols.

#### Pairwise Masking

Clients generate pairwise masks that cancel out during aggregation:

```typescript
import { SecureSumProtocol } from '@intelgraph/secure-aggregation';

const protocol = new SecureSumProtocol();

// Each client generates masks for other clients
const masks = protocol.generatePairwiseMasks(
  clientId,
  otherClientIds,
  modelDimension
);

// Apply masks to update
const maskedUpdate = protocol.maskUpdate(update, masks);

// Server aggregates masked updates (masks cancel out)
const aggregate = protocol.aggregateMasked(maskedUpdates);
```

**Properties:**
- Server learns only the aggregate, not individual updates
- Byzantine-robust with majority honest clients
- Efficient communication (O(d) per client)

### 4. Byzantine-Robust Aggregation

Defend against malicious clients submitting corrupted updates.

#### Krum Aggregation

Selects update closest to majority:

```typescript
const aggregator = new ByzantineRobustAggregator();
const robustUpdate = aggregator.krum(clientUpdates, numByzantine);
```

**Algorithm:**
1. For each update, compute distance to k nearest neighbors
2. Select update with minimum total distance
3. Discard outliers

**Guarantees:** Robust to f < n/2 - 2 Byzantine clients

#### Coordinate-wise Median

```typescript
const robustUpdate = aggregator.median(clientUpdates);
```

Takes median of each parameter independently.

**Guarantees:** Robust to f < n/2 Byzantine clients

#### Trimmed Mean

```typescript
const robustUpdate = aggregator.trimmedMean(clientUpdates, 0.2);
```

Trims top/bottom 20% before averaging.

**Guarantees:** Robust to known fraction of Byzantine clients

## Advanced Configurations

### Hierarchical Federated Learning

Multi-level aggregation for cross-silo scenarios:

```typescript
const config = {
  // ... base config
  hierarchicalConfig: {
    enabled: true,
    levels: 2,
    aggregatorsPerLevel: [5, 1],
    crossSiloAggregation: true,
  },
};
```

**Structure:**
```
Level 0: Devices → Edge Aggregators (5)
Level 1: Edge Aggregators → Cloud Aggregator (1)
```

**Benefits:**
- Reduced communication to central server
- Better scalability
- Geographic distribution

### Asynchronous Federated Learning

Allow clients to contribute at different rates:

```typescript
const config = {
  // ... base config
  asyncConfig: {
    enabled: true,
    staleness: 5,          // Max rounds client can be behind
    bufferSize: 10,        // Update buffer size
    mixingHyperparameter: 0.9,  // Weight for old updates
  },
};
```

**Update rule:**
```
w_{t+1} = w_t - η · α(τ) · ∇Fᵢ(w_{t-τ})

where:
- τ: staleness of update
- α(τ): staleness weight function
```

**Common staleness functions:**
- Constant: α(τ) = 1
- Polynomial: α(τ) = (τ + 1)^(-a)
- Hinge: α(τ) = max(0, 1 - τ/τ_max)

### Model Compression

Reduce communication costs:

```typescript
import { ModelCompressor } from '@intelgraph/federated-learning';

const compressor = new ModelCompressor();

// Quantization
const compressed = compressor.compress(weights, {
  method: 'quantization',
  compressionRatio: 0.5,
  parameters: { bits: 8 },
});

// Pruning
const compressed = compressor.compress(weights, {
  method: 'pruning',
  compressionRatio: 0.7,
  parameters: { threshold: 0.01 },
});

// Top-k Sparsification
const compressed = compressor.compress(weights, {
  method: 'sparsification',
  compressionRatio: 0.9,
  parameters: { topK: 1000 },
});
```

**Compression Methods:**

1. **Quantization**: Reduce bit precision
   - 32-bit → 8-bit: 4× compression
   - Minimal accuracy loss

2. **Pruning**: Remove small weights
   - Set weights < threshold to 0
   - Typical: 50-90% sparsity

3. **Sparsification**: Send only top-k gradients
   - Significant compression (>95%)
   - Requires error feedback

## Privacy Integration

### Differential Privacy for FL

Combine federated learning with differential privacy:

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

// In each round
const clientGradients = collectGradients();
const privateGradient = privateSGD.privateSGDStep(clientGradients, config);
```

**Privacy Guarantee:**

After T rounds with subsampling rate q and noise multiplier σ:

```
ε ≈ √(2T · q²) / σ
δ = q / (n · σ²)
```

### Secure Computation

Use homomorphic encryption for aggregation:

```typescript
import { PaillierScheme } from '@intelgraph/homomorphic-encryption';

const paillier = new PaillierScheme();
const keyPair = paillier.generateKeyPair();

// Clients encrypt their updates
const encryptedUpdates = updates.map(u =>
  paillier.encrypt(u, keyPair.publicKey)
);

// Server aggregates encrypted updates
let encryptedSum = encryptedUpdates[0];
for (let i = 1; i < encryptedUpdates.length; i++) {
  encryptedSum = paillier.add(encryptedSum, encryptedUpdates[i]);
}

// Decrypt final result
const aggregatedUpdate = paillier.decrypt(encryptedSum, keyPair.privateKey);
```

## Performance Tuning

### Communication Efficiency

**Problem:** Communication is the bottleneck in FL

**Solutions:**
1. **Gradient compression** (reduce upload size)
2. **Local epochs** (reduce rounds)
3. **Partial participation** (reduce clients per round)
4. **Model pruning** (reduce model size)

### Convergence Speed

**Problem:** FL converges slower than centralized training

**Solutions:**
1. **Adaptive learning rates**
2. **FedProx** (handle heterogeneity)
3. **Better client selection**
4. **Warm starting**

### Stragglers

**Problem:** Slow clients delay rounds

**Solutions:**
1. **Timeouts** (drop stragglers)
2. **Asynchronous FL** (don't wait)
3. **Resource-aware selection**
4. **Coded computation** (redundancy)

## Monitoring and Debugging

### Key Metrics

```typescript
const metrics = orchestrator.getTrainingMetrics(sessionId);

console.log(`
Total Rounds: ${metrics.totalRounds}
Current Round: ${metrics.currentRound}
Status: ${metrics.status}

Per-Round Metrics:
${metrics.rounds.map(r => `
  Round ${r.roundNumber}:
    - Loss: ${r.metrics.averageLoss}
    - Accuracy: ${r.metrics.averageAccuracy}
    - Duration: ${r.duration}ms
    - Participants: ${r.metrics.participatingClients}
`).join('\n')}
`);
```

### Debugging Checklist

- [ ] All clients have same model architecture
- [ ] Learning rate is appropriate
- [ ] Client selection is working
- [ ] Updates are not exploding/vanishing
- [ ] Privacy budget is not exhausted
- [ ] Byzantine detection is working

## Case Studies

### Healthcare: Collaborative Disease Prediction

**Scenario:** 100 hospitals want to train disease prediction model without sharing patient data

**Configuration:**
```typescript
const config = {
  minClientsPerRound: 10,
  maxClientsPerRound: 20,
  clientFraction: 0.2,
  numRounds: 500,
  learningRate: 0.001,
  localEpochs: 5,
  secureAggregation: true,
  differentialPrivacy: true,
  privacyBudget: { epsilon: 0.1, delta: 1e-6 },
  byzantineDefense: { enabled: true, strategy: 'krum', faultyClientsPercentage: 0.1 },
};
```

**Results:**
- 95% of centralized accuracy
- Zero data sharing
- HIPAA compliant
- Robust to malicious hospitals

## References

1. McMahan, B., et al. (2017). "Communication-Efficient Learning of Deep Networks from Decentralized Data"
2. Bonawitz, K., et al. (2017). "Practical Secure Aggregation for Privacy-Preserving Machine Learning"
3. Blanchard, P., et al. (2017). "Machine Learning with Adversaries: Byzantine Tolerant Gradient Descent"
4. Kairouz, P., et al. (2021). "Advances and Open Problems in Federated Learning"
