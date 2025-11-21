# DAG-Based Runbooks

Codified runbooks as Directed Acyclic Graphs (DAGs) with replay logs, gates, citation validation, and proof emission.

## Overview

This implementation provides three specialized runbooks for security intelligence operations:

1. **R1: Rapid Attribution (CTI)** - Cyber Threat Intelligence attribution
2. **R2: Phishing Cluster Discovery (DFIR)** - Digital Forensics and Incident Response
3. **R3: Disinformation Network Mapping** - Information operations analysis

## Features

### Core Capabilities

- **DAG Execution Engine**: Topological sorting with parallel execution where possible
- **Replay Logs**: Cryptographically signed, hash-chained audit trails
- **Gates**: Precondition and postcondition enforcement
- **Citation Validation**: Blocks publication when citations are missing
- **Proof Emission**: Cryptographic proofs for all evidence
- **Benchmark Timing**: Validates execution against time windows

### Gates

#### Precondition Gates

- **Legal Basis**: Validates GDPR Article 6 legal basis (consent, contract, legitimate interests, etc.)
- **Data License**: Ensures compatible data licensing (CC0, CC-BY, PROPRIETARY, etc.)
- **Approval**: Human-in-the-loop approval workflows
- **Dependency**: Ensures prerequisite nodes complete first

#### Postcondition Gates

- **KPI**: Validates Key Performance Indicators meet thresholds
- **Citation**: Ensures all evidence is properly cited
- **Proof**: Requires cryptographic proofs and chain of custody
- **Quality**: Validates evidence quality scores

### Citation Requirements

All runbooks enforce:
- Minimum citation counts per evidence
- Source URLs with timestamps
- Author attribution
- Content integrity hashes

Publication is **blocked** if citation requirements are not met.

## Runbook Specifications

### R1: Rapid Attribution (CTI)

**Purpose**: Rapidly attribute cyber attacks to threat actors using CTI.

**Workflow**:
1. Collect threat indicators (IPs, domains, hashes)
2. Query threat intelligence feeds
3. Correlate with threat actor profiles
4. Generate attribution report

**Preconditions**:
- Legal basis: Legitimate interests or public task
- Data license: Internal use only

**Postconditions**:
- Confidence score ≥ 70%
- At least 3 cited sources
- Cryptographic proof of analysis

**Benchmark**: 5 minutes

**KPIs**:
- `indicatorCount`: Number of indicators collected
- `tiSourceCount`: Threat intelligence sources queried
- `matchedActors`: Threat actors matched
- `confidenceScore`: Attribution confidence (0-1)

### R2: Phishing Cluster Discovery (DFIR)

**Purpose**: Discover and analyze clusters of related phishing campaigns.

**Workflow**:
1. Collect phishing emails and artifacts
2. Extract forensic indicators
3. Perform cluster analysis
4. Build attack timeline
5. Generate DFIR report

**Preconditions**:
- Legal basis: Legitimate interests or legal obligation
- Data license: Internal use only

**Postconditions**:
- Cluster purity ≥ 80%
- At least 2 clusters identified
- Complete chain of custody
- At least 3 cited evidence sources

**Benchmark**: 10 minutes

**KPIs**:
- `emailCount`: Phishing emails analyzed
- `indicatorCount`: Forensic indicators extracted
- `clusterCount`: Campaign clusters identified
- `clusterPurity`: Clustering quality score (0-1)
- `timelineCount`: Timeline events

### R3: Disinformation Network Mapping

**Purpose**: Map networks that propagate disinformation.

**Workflow**:
1. Collect disinformation samples
2. Extract narratives and claims
3. Map propagation networks
4. Analyze coordination patterns
5. Generate network map

**Preconditions**:
- Legal basis: Public task or legitimate interests
- Data license: Compatible with research (CC-BY, public domain, etc.)

**Postconditions**:
- Network coverage ≥ 75%
- At least 3 coordination patterns identified
- At least 5 cited sources
- Cryptographic proof

**Benchmark**: 15 minutes

**KPIs**:
- `sampleCount`: Content samples collected
- `narrativeCount`: Narratives identified
- `nodeCount`: Network nodes (accounts/entities)
- `edgeCount`: Network edges (relationships)
- `coordinationPatternCount`: Coordination patterns detected
- `networkCoverage`: Network density metric (0-1)

## Usage

### Basic Execution

```typescript
import { DAGExecutor } from './dags/dag-executor';
import { createR1RapidAttributionRunbook } from './r1-rapid-attribution';
import { LegalBasis, DataLicense } from './dags/types';

// Create runbook
const runbook = createR1RapidAttributionRunbook();

// Create executor
const executor = new DAGExecutor();

// Execute
const result = await executor.execute(runbook, {
  tenantId: 'your-tenant-id',
  userId: 'analyst-id',
  legalBasis: LegalBasis.LEGITIMATE_INTERESTS,
  dataLicenses: [DataLicense.INTERNAL_USE_ONLY],
  inputData: {
    incidentData: {
      id: 'incident-001',
      ips: ['192.168.1.100'],
      domains: ['malicious.com'],
      hashes: ['abc123...'],
    },
  },
});

// Check results
console.log('Success:', result.success);
console.log('Publication allowed:', result.publicationAllowed);
console.log('Evidence count:', result.evidence.length);
console.log('Citation count:', result.citations.length);
console.log('Benchmark met:', result.benchmarkComparison.withinBenchmark);

// Verify replay log integrity
const integrity = executor.verifyReplayLogIntegrity();
console.log('Replay log valid:', integrity.valid);
```

### Publication Blocking

If citations are missing or KPIs are not met, publication will be blocked:

```typescript
if (!result.publicationAllowed) {
  console.log('Publication blocked:');
  result.publicationBlockReasons.forEach(reason => {
    console.log('  -', reason);
  });
}
```

Example output:
```
Publication blocked:
  - Publication gate 'Citation Check' failed: Citation validation failed: Evidence evidence-123 has only 1 citation(s), requires at least 3
  - Publication gate 'KPI: confidenceScore' failed: KPI metric 'confidenceScore' value 0.65 does not meet threshold gte 0.7
```

### Replay Log

Access the replay log for audit trails:

```typescript
const replayLog = executor.getReplayLog();
const summary = replayLog.getSummary();

console.log('Total entries:', summary.totalEntries);
console.log('Duration:', summary.duration);
console.log('Success:', summary.success);
console.log('Nodes executed:', summary.nodes);

// Export replay log
const json = replayLog.toJSON();
```

### Citation Reports

Generate citation reports:

```typescript
import { CitationValidator } from './dags/citation-validator';

const report = CitationValidator.generateCitationReport(
  result.evidence,
  result.citations
);

console.log(report);
```

Example output:
```
=== CITATION REPORT ===

Total Evidence: 4
Total Citations: 8

Evidence: evidence-indicators-123 (threat_indicators)
  Collected: 2024-01-15T10:30:00.000Z
  Citations: 1
    - [cite-123-abc] Incident Report
      URL: https://incident-tracker.example.com/001
      Author: John Doe
      Timestamp: 2024-01-15T10:00:00.000Z
      Hash: a1b2c3d4e5f6g7h8...

Evidence: evidence-ti-enrichment-456 (threat_intelligence)
  Collected: 2024-01-15T10:31:30.000Z
  Citations: 5
    - [cite-456-def] MISP
      URL: https://ti-feed.example.com/misp
      ...
```

## Architecture

### File Structure

```
server/src/conductor/runbooks/
├── dags/
│   ├── types.ts                 # Core type definitions
│   ├── replay-log.ts            # Replay log implementation
│   ├── gates.ts                 # Gate executor and factory
│   ├── citation-validator.ts   # Citation validation
│   ├── dag-executor.ts          # DAG execution engine
│   └── index.ts                 # Public API exports
├── r1-rapid-attribution.ts      # R1 runbook
├── r2-phishing-cluster.ts       # R2 runbook
├── r3-disinformation-network.ts # R3 runbook
├── runbook-examples.ts          # Usage examples
├── runbook-dags.test.ts         # Tests
└── RUNBOOK_DAGS.md              # This file
```

### DAG Execution Flow

1. **Topological Sort**: Resolve dependencies to determine execution order
2. **Batch Creation**: Group independent nodes for parallel execution
3. **For each batch**:
   - Execute precondition gates
   - Execute node (with timeout/retry)
   - Execute postcondition gates
   - Update shared context
   - Log to replay log
4. **Publication Gates**: Final validation before allowing publication
5. **Result Assembly**: Collect evidence, citations, proofs, KPIs

### Replay Log Structure

Hash-chained entries with cryptographic signatures:

```
Genesis Hash
    ↓
Entry 1 (hash of: previous + timestamp + data)
    ↓
Entry 2 (hash of: previous + timestamp + data)
    ↓
Entry 3 (hash of: previous + timestamp + data)
    ↓
...
```

Each entry can be independently verified and the entire chain ensures immutability.

## Testing

Run tests:

```bash
npm test runbook-dags.test.ts
```

Run examples:

```bash
ts-node server/src/conductor/runbooks/runbook-examples.ts
```

## Compliance

### Legal Basis (GDPR Article 6)

- **Consent**: Explicit user consent
- **Contract**: Necessary for contract performance
- **Legal Obligation**: Required by law
- **Vital Interests**: Protect vital interests
- **Public Task**: Public interest or official authority
- **Legitimate Interests**: Legitimate business interests

### Data Licenses

- **PROPRIETARY**: Internal/commercial data
- **CC0**: Public domain dedication
- **CC-BY**: Attribution required
- **CC-BY-SA**: Attribution + ShareAlike
- **CC-BY-NC**: Attribution + NonCommercial
- **ODbL**: Open Database License
- **PUBLIC_DOMAIN**: Public domain
- **INTERNAL_USE_ONLY**: Restricted to internal use

## Best Practices

1. **Always specify legal basis**: Required for GDPR compliance
2. **Cite all sources**: Publication will be blocked otherwise
3. **Include timestamps**: Required for audit trails
4. **Generate proofs**: Ensures evidence integrity
5. **Monitor benchmarks**: Track execution time against benchmarks
6. **Verify replay logs**: Check integrity after execution
7. **Handle errors gracefully**: Implement rollback functions
8. **Use quality scores**: Track evidence quality in metadata

## Future Enhancements

- [ ] Real-time streaming execution
- [ ] Distributed DAG execution across workers
- [ ] ML-based quality scoring
- [ ] Integration with external TI feeds
- [ ] Automated counter-narrative generation
- [ ] Real-time collaboration features
- [ ] Enhanced visualization of network maps
- [ ] Integration with incident response platforms

## License

Proprietary - Internal use only
