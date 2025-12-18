# DataLab Service

Secure data lab operations for sandbox environments including synthetic data generation, data cloning with anonymization, and scenario simulation.

## Overview

This service provides:

- **Data Cloning**: Clone production data structure with synthetic values, anonymization, or sampling
- **Synthetic Data Generation**: Create realistic synthetic datasets for testing and research
- **Data Anonymization**: Apply various anonymization techniques (redaction, hashing, k-anonymity, etc.)
- **Scenario Simulation**: Run pre-defined or custom scenarios for training and testing
- **Promotion Workflow**: Promote successful lab configurations to production with approval

## Features

### Clone Strategies

- **Structure Only**: Schema/structure without actual data
- **Synthetic**: Replace all values with synthetic data
- **Anonymized**: De-identify real data
- **Sampled**: Small sample with anonymization
- **Fuzzed**: Real structure with fuzzed values

### Anonymization Techniques

- Redaction
- Hashing (SHA256, SHA512, Blake2b)
- Pseudonymization
- Generalization
- Masking
- Noise Addition
- K-Anonymity
- Differential Privacy

### Built-in Generators

- Person (names, emails, phones)
- Location (cities, countries, coordinates)
- Company (names, industries)
- Finance (amounts, currencies, accounts)
- Dates and UUIDs
- Lorem ipsum text

## Installation

```bash
pnpm add @intelgraph/datalab-service
```

## Usage

### Data Cloning

```typescript
import { DataCloneService, CloneStrategy, DataSourceType } from '@intelgraph/datalab-service';

const cloneService = new DataCloneService();

const result = await cloneService.clone(
  {
    sandboxId: 'sandbox-123',
    name: 'Research Data Clone',
    sourceType: DataSourceType.NEO4J,
    sourceConfig: { investigationId: 'inv-456' },
    strategy: CloneStrategy.ANONYMIZED,
    fieldAnonymization: [
      { fieldPath: 'email', technique: 'hashing', config: {} },
      { fieldPath: 'phone', technique: 'masking', config: { maskFromEnd: 4 } },
    ],
    requestedBy: 'user-id',
  },
  sandboxProfile
);
```

### Synthetic Data Generation

```typescript
import { SyntheticDataGenerator } from '@intelgraph/datalab-service';

const generator = new SyntheticDataGenerator();

const result = await generator.generate({
  sandboxId: 'sandbox-123',
  name: 'Test Dataset',
  schemas: [
    {
      entityType: 'Person',
      fields: [
        { name: 'name', type: 'string', generator: 'person.fullName', config: {} },
        { name: 'email', type: 'string', generator: 'internet.email', config: {} },
      ],
      relationshipTypes: [
        { type: 'KNOWS', targetEntityType: 'Person', probability: 0.3 },
      ],
    },
  ],
  config: {
    totalEntities: 1000,
    seed: 12345, // For reproducibility
    generateRelationships: true,
  },
  requestedBy: 'user-id',
});
```

### Data Anonymization

```typescript
import { DataAnonymizer, AnonymizationTechnique } from '@intelgraph/datalab-service';

const anonymizer = new DataAnonymizer('custom-salt');

const result = await anonymizer.anonymize(data, [
  { fieldPath: 'ssn', technique: AnonymizationTechnique.HASHING, config: {} },
  { fieldPath: 'name', technique: AnonymizationTechnique.PSEUDONYMIZATION, config: {} },
  { fieldPath: 'salary', technique: AnonymizationTechnique.NOISE_ADDITION, config: {} },
]);
```

### Scenario Simulation

```typescript
import { DataLabAPI } from '@intelgraph/datalab-service';

const api = new DataLabAPI();

// List available scenarios
const scenarios = await api.listScenarioTemplates('fraud_detection');

// Run a scenario
const result = await api.runScenario({
  sandboxId: 'sandbox-123',
  templateId: 'fraud-detection-001',
  name: 'Fraud Detection Training',
  scale: 2.0, // Double the default entity count
  seed: 42,
  requestedBy: 'user-id',
});
```

### Promotion Workflow

```typescript
import { PromotionWorkflow } from '@intelgraph/datalab-service';

const workflow = new PromotionWorkflow();

// Create promotion request
const request = await workflow.createRequest(
  'sandbox-123',
  'production-tenant',
  'requester-id',
  { type: 'query', id: 'query-456', name: 'Optimized Search Query' },
  'Justification for promotion to production'
);

// Submit for review
await workflow.submitForReview(request.id, ['reviewer1', 'reviewer2']);

// Add approvals
await workflow.addApproval(request.id, 'reviewer1', 'approve', 'Looks good');

// Execute promotion
await workflow.executePromotion(request.id);
```

## API Reference

### DataLabAPI

Main entry point for data lab operations.

- `startSession(sandboxId, userId)`: Start a data lab session
- `endSession(sessionId)`: End a session
- `cloneData(request)`: Clone data into sandbox
- `generateSyntheticData(request)`: Generate synthetic data
- `listScenarioTemplates(category?)`: List available scenarios
- `runScenario(request)`: Run scenario simulation
- `executeQuery(request)`: Execute query in sandbox
- `createPromotionRequest(...)`: Create promotion request

### DataCloneService

- `clone(request, profile)`: Clone data with strategy

### SyntheticDataGenerator

- `generate(request)`: Generate synthetic data
- `registerGenerator(name, fn)`: Register custom generator

### DataAnonymizer

- `anonymize(data, configs)`: Anonymize data
- `anonymizeValue(value, config)`: Anonymize single value
- `resetMappings()`: Reset pseudonym mappings

### PromotionWorkflow

- `createRequest(...)`: Create promotion request
- `submitForReview(requestId, reviewers)`: Submit for review
- `addApproval(...)`: Add approval/rejection
- `executePromotion(requestId)`: Execute promotion
- `rollback(requestId, reason)`: Rollback promotion

## Testing

```bash
pnpm test
```

## License

MIT
