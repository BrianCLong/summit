# R1: Rapid Attribution (CTI Runbook)

Automated cyber threat intelligence runbook for rapid threat actor attribution analysis.

## Overview

The Rapid Attribution runbook automates the process of attributing cyber threats to specific threat actors by:

1. **Ingesting indicators** from threat intelligence feeds
2. **Resolving infrastructure** using WHOIS, DNS, GeoIP, and ASN data
3. **Correlating to ATT&CK** framework techniques and tactics
4. **Mining patterns** across indicators and infrastructure
5. **Generating hypotheses** with evidence-backed attribution

## Workflow

```
┌─────────────────┐
│ Ingest          │
│ Indicators      │──┐
└─────────────────┘  │
                     │
┌─────────────────┐  │
│ Resolve         │◀─┘
│ Infrastructure  │──┐
└─────────────────┘  │
                     │
┌─────────────────┐  │
│ Correlate       │◀─┤
│ ATT&CK          │  │
└─────────────────┘  │
         │           │
         └─────┐     │
               ▼     │
       ┌─────────────┴──┐
       │ Pattern        │
       │ Mining         │
       └─────────────┬──┘
                     │
                     ▼
       ┌──────────────────┐
       │ Generate         │
       │ Hypothesis       │
       └──────────────────┘
                     │
                     ▼
              [Final Report]
```

## KPIs

- **Time-to-hypothesis**: < 30 minutes (simulated)
- **Minimum evidence per claim**: 3 pieces of evidence
- **Minimum confidence**: 0.6 (60%)

## Usage

### Prerequisites

```bash
cd runbooks/cti/rapid-attribution
npm install
npm run build
```

### Running R1

```typescript
import { RunbookEngine } from '@intelgraph/runbook-engine';
import { R1_RAPID_ATTRIBUTION } from '@intelgraph/runbook-r1-rapid-attribution';
import {
  IngestIndicatorsExecutor,
  ResolveInfrastructureExecutor,
  CorrelateAttackExecutor,
  PatternMiningExecutor,
  GenerateHypothesisExecutor,
} from '@intelgraph/runbook-r1-rapid-attribution';

// Create engine
const engine = new RunbookEngine(config);

// Register executors
engine.registerExecutor(new IngestIndicatorsExecutor());
engine.registerExecutor(new ResolveInfrastructureExecutor());
engine.registerExecutor(new CorrelateAttackExecutor());
engine.registerExecutor(new PatternMiningExecutor());
engine.registerExecutor(new GenerateHypothesisExecutor());

// Register runbook
engine.registerRunbook(R1_RAPID_ATTRIBUTION);

// Execute
const executionId = await engine.startRunbook(
  'r1-rapid-attribution',
  {
    legalBasis: {
      authority: 'SECURITY_INVESTIGATION',
      caseId: 'CASE-2025-001',
      classification: 'SENSITIVE',
      authorizedUsers: ['analyst-1'],
    },
    tenantId: 'my-org',
    initiatedBy: 'analyst-1',
    assumptions: [
      'Indicators from trusted feeds',
      'Attribution based on TTPs only',
    ],
    timeRange: {
      startTime: new Date('2025-01-01'),
      endTime: new Date('2025-01-15'),
    },
  },
  {
    sources: [
      {
        type: 'file',
        location: 's3://threat-intel/indicators.json',
      },
    ],
  }
);

// Check result
const execution = await engine.getStatus(executionId);
console.log(execution.output);
```

## Output Format

```typescript
{
  hypotheses: [
    {
      threatActor: 'APT28',
      confidence: 0.87,
      evidenceIds: ['ev-1', 'ev-2', 'ev-3', ...],
      reasoning: 'TTP overlap with known APT28 campaigns...',
      techniques: ['T1566.001', 'T1071.001', ...],
      infrastructure: ['AS15169', '192.0.2.1', ...],
    },
  ],
  report: {
    title: 'Rapid Attribution Analysis Report',
    summary: 'Analysis of 5 threat indicators identified 2 potential threat actor attributions...',
    confidence: 0.87,
    evidenceCount: 15,
    recommendations: [
      'Monitor infrastructure for continued activity',
      'Deploy detection rules for identified ATT&CK techniques',
      ...
    ],
  },
}
```

## Evidence Collection

Every step collects evidence with:

- **Unique ID**: UUID for each piece of evidence
- **Type**: indicator, enrichment, attack-correlation, pattern, attribution-report
- **Source Reference**: Link to original data
- **Timestamp**: When collected
- **Confidence**: Score 0-1

All claims in the final report are backed by evidence IDs.

## Structured Logging

Every step logs:

- **Assumptions**: Explicit assumptions made
- **Data Scope**: What data is being analyzed
- **Legal Basis**: Authority and classification
- **Evidence Links**: References to collected evidence

Example log:

```typescript
{
  id: 'log-123',
  timestamp: '2025-01-15T10:30:00Z',
  level: 'info',
  stepId: 'ingest-indicators',
  executionId: 'exec-456',
  message: 'Ingesting threat indicators',
  assumptions: [
    'Indicators are in standard format',
    'Duplicate indicators will be deduplicated',
  ],
  dataScope: 'Time range: 2025-01-01 to 2025-01-15',
  metadata: {
    legalBasis: 'SECURITY_INVESTIGATION',
    classification: 'SENSITIVE',
  },
}
```

## Step Details

### 1. Ingest Indicators

Loads threat indicators from sources:
- IPv4/IPv6 addresses
- Domains
- URLs
- File hashes (SHA256, MD5)

**Configuration**:
- `deduplication`: Remove duplicates
- `validateFormat`: Validate indicator formats

### 2. Resolve Infrastructure

Enriches indicators with infrastructure data:
- WHOIS records
- DNS resolution
- GeoIP location
- ASN information

**Configuration**:
- `enrichmentSources`: Which sources to use
- `cacheResults`: Cache enrichment data

### 3. Correlate ATT&CK

Maps indicators and behaviors to MITRE ATT&CK framework:
- Techniques (e.g., T1566.001)
- Tactics (e.g., TA0001 - Initial Access)
- Confidence scoring

**Configuration**:
- `attackVersion`: ATT&CK framework version
- `minimumConfidence`: Threshold for correlation

### 4. Pattern Mining

Identifies patterns and clusters:
- Infrastructure patterns (ASN, registrar, geo)
- Behavioral patterns (TTP combinations)
- Graph-based clustering

**Configuration**:
- `algorithms`: DBSCAN, K-Means, graph-clustering
- `minimumClusterSize`: Minimum entities per cluster

### 5. Generate Hypothesis

Creates attribution hypothesis:
- Threat actor identification
- Confidence scoring
- Evidence linking
- Recommendations

**Configuration**:
- `minimumEvidenceCount`: Minimum evidence per hypothesis
- `confidenceThreshold`: Minimum confidence
- `includeTimeline`: Include activity timeline

## Testing

```bash
# Run all tests
npm test

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage
```

### Integration Test

The integration test verifies:
- ✅ End-to-end execution completes successfully
- ✅ Time-to-hypothesis < 30 minutes
- ✅ All hypotheses have ≥3 pieces of evidence
- ✅ Minimum confidence ≥ 0.6
- ✅ Structured logs include assumptions and legal basis
- ✅ Idempotency (duplicate detection)
- ✅ Replay functionality

## Idempotency

Re-running R1 with the same inputs returns the same execution ID and results. This prevents duplicate analysis and ensures consistency.

## Future Enhancements

- [ ] Real ingestion service integration
- [ ] Neo4j graph database integration
- [ ] Machine learning for pattern recognition
- [ ] Real-time threat actor database
- [ ] STIX 2.1 output format
- [ ] Automated IOC sharing
- [ ] Timeline visualization
- [ ] Confidence calibration

## References

- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [STIX 2.1 Specification](https://oasis-open.github.io/cti-documentation/)
- IntelGraph Runbook Engine Documentation

## License

PROPRIETARY - IntelGraph CTI Team
