# @intelgraph/threat-detection-core

Core types, interfaces, and utilities for the IntelGraph Advanced Threat Detection System.

## Installation

```bash
pnpm add @intelgraph/threat-detection-core
```

## Features

- Comprehensive TypeScript types for threat detection
- Event and alert models
- ML model interfaces
- Threat intelligence types
- Threat hunting types
- Scoring utilities
- Validation helpers
- Event correlation tools

## Usage

### Basic Types

```typescript
import {
  ThreatEvent,
  ThreatSeverity,
  ThreatCategory,
  EventSource
} from '@intelgraph/threat-detection-core';

const event: ThreatEvent = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: new Date(),
  source: EventSource.NETWORK,
  category: ThreatCategory.DDOS,
  severity: ThreatSeverity.CRITICAL,
  sourceIp: '192.168.1.100',
  threatScore: 0.95,
  confidenceScore: 0.9,
  indicators: ['192.168.1.100'],
  description: 'DDoS attack detected',
  rawData: {},
  metadata: {},
  responded: false
};
```

### Scoring Utilities

```typescript
import {
  calculateThreatScore,
  scoreToSeverity,
  calculateConfidenceScore
} from '@intelgraph/threat-detection-core';

const score = calculateThreatScore({
  anomalyScore: 0.8,
  confidenceScore: 0.9,
  impactScore: 0.7,
  severityScore: 0.9
});

const severity = scoreToSeverity(score);
```

### Validation

```typescript
import {
  validateThreatEvent,
  isValidIp,
  isValidDomain
} from '@intelgraph/threat-detection-core';

const { valid, errors } = validateThreatEvent(event);

if (!valid) {
  console.error('Validation errors:', errors);
}

if (isValidIp('192.168.1.1')) {
  console.log('Valid IP address');
}
```

### Event Correlation

```typescript
import {
  generateCorrelationId,
  calculateEventSimilarity,
  correlateEvents
} from '@intelgraph/threat-detection-core';

const correlationId = generateCorrelationId(event);
const similarity = calculateEventSimilarity(event1, event2);
const groups = correlateEvents(events, 0.7);
```

## API Reference

See [documentation](../../docs/security/THREAT_DETECTION.md) for full API reference.

## License

PROPRIETARY
