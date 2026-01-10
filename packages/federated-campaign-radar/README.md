# Federated Campaign Radar

Privacy-preserving cross-organization campaign signal sharing for coordinated information warfare defense.

## Overview

Federated Campaign Radar enables organizations to collaboratively detect and respond to coordinated information operations while preserving the privacy of their internal data. It implements three patentable primitives:

1. **Federated Narrative Clustering with Privacy Budgets** - Cluster similar narratives across organizations using differential privacy to prevent signal source identification
2. **Credential-Aware Indicator Exchange Protocol** - Exchange campaign indicators with C2PA content credential validation for provenance assurance
3. **Actionable Early-Warning Threshold System** - Detect cross-tenant coordination spikes and auto-generate response packs

## Features

### Signal Normalization
- Normalize diverse inputs into a unified schema (narratives, URLs, media hashes, account handles, coordination patterns)
- C2PA Content Credentials validation for media provenance
- Semantic embedding generation for similarity matching
- Privacy-preserving hashing with HMAC-SHA256

### Privacy-Preserving Federation
- Differential privacy with configurable epsilon/delta budgets
- Secure aggregation protocol support
- MPC-style private set intersection
- Privacy budget tracking per participant
- Sharing agreements between organizations

### Campaign Clustering
- Cosine similarity-based clustering of signals
- Cross-tenant confidence boosting for network effects
- Velocity metrics for growth trajectory analysis
- Coordination pattern detection (synchronized posting, copy-paste campaigns)

### Early-Warning Alerts
- Configurable alert thresholds
- Cross-tenant spike detection
- Auto-escalation for unacknowledged alerts
- Response pack generation with:
  - Narrative intelligence summary
  - Stakeholder briefing
  - Communications playbook
  - Measurement plan

### Audit Trail
- NIST AI RMF aligned governance controls
- Cryptographic hash chain for log integrity
- Incident management lifecycle
- Export to JSON, CSV, or SIEM (CEF format)

## Installation

```bash
npm install @summit/federated-campaign-radar
```

## Quick Start

```typescript
import { createFederatedCampaignRadar } from '@summit/federated-campaign-radar';

// Create a fully configured instance
const radar = createFederatedCampaignRadar({
  participantId: 'my-org-participant-id',
  organizationId: 'my-org-id',
  privacyLevel: 'balanced', // 'strict' | 'balanced' | 'permissive'
  enableC2PA: true,
  enableAudit: true,
});

// Submit a signal
const signal = await radar.submitSignal({
  text: 'Detected narrative about election interference',
  platform: 'twitter',
});

// Run clustering
const clusters = await radar.runClustering();

// Check for alerts
const alerts = radar.getActiveAlerts();
```

## Core Components

### SignalNormalizer

Normalizes raw inputs into standardized campaign signals:

```typescript
import { SignalNormalizer, PrivacyLevel } from '@summit/federated-campaign-radar';

const normalizer = new SignalNormalizer({
  enableC2PAValidation: true,
  hashPepper: process.env.SIGNAL_HASH_PEPPER,
  embeddingDimension: 768,
  defaultPrivacyLevel: PrivacyLevel.HASHED,
});

// Normalize a narrative
const narrativeSignal = await normalizer.normalizeNarrative({
  text: 'Breaking: Viral claim about election fraud...',
  platform: 'facebook',
});

// Normalize a URL
const urlSignal = await normalizer.normalizeURL({
  url: 'https://suspicious-domain.com/fake-news',
});

// Normalize a media item with C2PA manifest
const mediaSignal = await normalizer.normalizeMedia({
  mediaHash: 'abc123...',
  mediaType: 'image/jpeg',
  platform: 'instagram',
  c2paManifest: { /* ... */ },
});
```

### FederationService

Manages privacy-preserving federation between organizations:

```typescript
import { FederationService, SignalType, PrivacyLevel } from '@summit/federated-campaign-radar';

const federation = new FederationService({
  participantId: 'org-alpha',
  organizationId: 'alpha-inc',
  epsilon: 0.5,           // Differential privacy budget
  delta: 1e-6,
  minParticipantsForAggregation: 3,
  enableSecureAggregation: true,
});

// Register participants
await federation.registerParticipant('org-beta', 'public-key', ['SIGNAL_SHARING']);

// Create sharing agreement
const agreement = await federation.createSharingAgreement(
  ['org-alpha', 'org-beta'],
  [SignalType.NARRATIVE, SignalType.URL],
  [PrivacyLevel.HASHED, PrivacyLevel.AGGREGATE_ONLY],
  30, // 30 days validity
);

// Submit signal to federation
const result = await federation.submitSignal(signal);

// Query aggregated stats with differential privacy
const stats = await federation.queryAggregatedStats(SignalType.NARRATIVE, 24);

// Check privacy budget
const budget = federation.getPrivacyBudgetStatus();
console.log(`Remaining budget: ${budget.remaining}`);
```

### ClusteringEngine

Performs federated narrative clustering:

```typescript
import { ClusteringEngine, ThreatLevel } from '@summit/federated-campaign-radar';

const clustering = new ClusteringEngine(federationService, {
  similarityThreshold: 0.75,
  minClusterSize: 3,
  crossTenantBoostFactor: 1.5,
});

// Add signals
signals.forEach(s => clustering.addSignal(s));

// Perform clustering
const clusters = await clustering.performClustering();

// Get active high-threat clusters
const highThreat = clustering.getActiveClusters(ThreatLevel.HIGH);

// Compute cross-tenant overlap
const overlap = clustering.computeCrossTenantOverlap();
```

### AlertEngine

Early-warning alert system:

```typescript
import { AlertEngine, AlertType, AlertSeverity } from '@summit/federated-campaign-radar';

const alerts = new AlertEngine(clusteringEngine, federationService, {
  defaultCooldownMs: 3600000, // 1 hour
  maxActiveAlerts: 100,
  enableAutoEscalation: true,
});

// Register custom threshold
alerts.registerThreshold({
  id: 'high-velocity-campaign',
  alertType: AlertType.CAMPAIGN_EMERGING,
  conditions: [
    { metric: 'signalCount', operator: 'gte', value: 50 },
    { metric: 'crossTenantConfidence', operator: 'gte', value: 0.8 },
  ],
  severity: AlertSeverity.HIGH,
  cooldownMs: 1800000,
});

// Evaluate clusters for alerts
const previousStates = new Map();
await alerts.evaluateClusters(clusters, previousStates);

// Get active alerts
const activeAlerts = alerts.getActiveAlerts();

// Generate response pack
const responsePack = await alerts.generateResponsePack(alertId);
console.log(responsePack.commsPlaybook.recommendedActions);

// Acknowledge and resolve
alerts.acknowledgeAlert(alertId, 'analyst-1');
alerts.resolveAlert(alertId, 'analyst-1', {
  resolutionType: 'MITIGATED',
  notes: 'Counter-narrative deployed successfully',
  lessonsLearned: ['Earlier detection needed'],
});
```

### AuditService

NIST AI RMF aligned audit trail:

```typescript
import { AuditService } from '@summit/federated-campaign-radar';

const audit = new AuditService({
  organizationId: 'my-org',
  retentionDays: 365,
  enableIntegrityChecks: true,
});

// Log audit event
audit.logEvent({
  eventType: 'SIGNAL_SUBMISSION',
  category: 'DATA_PROCESSING',
  action: 'NORMALIZE_SIGNAL',
  resourceType: 'SIGNAL',
  resourceId: signal.id,
  outcome: 'SUCCESS',
  actor: { id: 'system', type: 'SYSTEM' },
  details: { signalType: 'NARRATIVE' },
});

// Create incident
const incidentId = audit.createIncident({
  title: 'Coordinated campaign detected',
  description: 'Cross-tenant cluster with 95% confidence',
  severity: 'HIGH',
  relatedAlertIds: [alertId],
  relatedClusterIds: [clusterId],
});

// Get compliance score
const score = audit.getComplianceScore();
console.log(`Compliance: ${score.overallScore}%`);

// Verify log integrity
const integrity = audit.verifyIntegrity();
console.log(`Chain valid: ${integrity.valid}`);

// Export for SIEM
const cefLogs = audit.exportEvents('SIEM', { startTime: yesterday });
```

## GraphQL API

The package includes a complete GraphQL API:

```typescript
import { schema, resolvers, createResolverContext } from '@summit/federated-campaign-radar';
import { ApolloServer } from '@apollo/server';

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
});

// In request handler:
const context = radar.createResolverContext();
```

### Example Queries

```graphql
# Get active clusters
query GetClusters {
  getClusters(
    filters: { minThreatLevel: MEDIUM, minCrossTenantConfidence: 0.7 }
    limit: 10
  ) {
    id
    signalCount
    threatLevel
    crossTenantConfidence
    participatingOrganizations
    velocityMetrics {
      signalsPerHour
      growthTrajectory
    }
  }
}

# Get alerts with response pack
query GetAlert($alertId: ID!) {
  getAlert(alertId: $alertId) {
    id
    severity
    status
    relatedClusters {
      id
      threatLevel
    }
  }
}

# Subscribe to new alerts
subscription OnAlertCreated {
  alertCreated(minSeverity: HIGH) {
    id
    alertType
    severity
    message
    crossTenantSignal
  }
}
```

### Example Mutations

```graphql
# Submit a signal
mutation SubmitSignal($input: SignalInput!) {
  submitSignal(input: $input) {
    success
    signalId
    federatedSignalId
  }
}

# Generate response pack
mutation GenerateResponsePack($alertId: ID!) {
  generateResponsePack(alertId: $alertId) {
    id
    narrativeIntelligence {
      summary
      keyThemes
      topSpreaders {
        identifier
        platform
        reach
      }
    }
    commsPlaybook {
      recommendedActions
      messagingGuidance
      channelRecommendations
    }
  }
}
```

## Privacy Levels

| Level | Description | Sharing Behavior |
|-------|-------------|------------------|
| `PUBLIC` | Can be shared freely | Full content shared |
| `HASHED` | Content hashed before sharing | Only hashes shared |
| `ENCRYPTED` | Encrypted for specific recipients | End-to-end encrypted |
| `AGGREGATE_ONLY` | Only in aggregations | Never shared individually |
| `INTERNAL_ONLY` | Never leaves organization | Local processing only |

## Threat Levels

| Level | Description | Typical Response |
|-------|-------------|------------------|
| `INFORMATIONAL` | Background noise | Monitor |
| `LOW` | Minor concern | Track |
| `MEDIUM` | Moderate threat | Investigate |
| `HIGH` | Significant threat | Respond |
| `CRITICAL` | Severe threat | Escalate immediately |

## Configuration

### Privacy Presets

```typescript
// Strict: Maximum privacy, slower detection
createFederatedCampaignRadar({
  privacyLevel: 'strict',
  // epsilon: 0.1, delta: 1e-8, minParticipants: 5
});

// Balanced: Good privacy with reasonable utility
createFederatedCampaignRadar({
  privacyLevel: 'balanced',
  // epsilon: 0.5, delta: 1e-6, minParticipants: 3
});

// Permissive: Maximum utility, acceptable privacy
createFederatedCampaignRadar({
  privacyLevel: 'permissive',
  // epsilon: 1.0, delta: 1e-5, minParticipants: 2
});
```

### Environment Variables

```bash
# Required
SIGNAL_HASH_PEPPER=your-secret-pepper

# Optional
FEDERATION_EPSILON=0.5
FEDERATION_DELTA=1e-6
MIN_AGGREGATION_PARTICIPANTS=3
AUDIT_RETENTION_DAYS=365
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Organization A                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Signal        │  │Clustering    │  │Alert         │          │
│  │Normalizer    │─▶│Engine        │─▶│Engine        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Federation Service                      │   │
│  │  (Differential Privacy, Secure Aggregation, MPC)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │  Privacy-Preserving Exchange
          │  (Hashed Indicators, Aggregated Stats)
          │
┌─────────┼───────────────────────────────────────────────────────┐
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Federation Service                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Signal        │  │Clustering    │  │Alert         │          │
│  │Normalizer    │  │Engine        │  │Engine        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                    Organization B                                │
└─────────────────────────────────────────────────────────────────┘
```

## License

MIT
