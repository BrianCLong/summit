---
id: SEC-002
name: Counter-Deception Lab (Defensive Only)
slug: counter-deception-lab
category: security
subcategory: defensive-security
priority: medium
status: ready
version: 1.0.0
created: 2025-11-29
updated: 2025-11-29
author: Engineering Team

description: |
  Produces a lab that scores source credibility, mines fabrication patterns
  (metadata mismatches, non-biometric stylometry), and plants honeytoken canaries
  with response drills.

objective: |
  Detect and defend against information manipulation and deception with automated
  credibility scoring and honeytoken tripwires.

tags:
  - counter-deception
  - credibility
  - honeytokens
  - fabrication-detection
  - defensive-security
  - information-warfare

dependencies:
  services:
    - postgresql
    - neo4j
  packages:
    - "@intelgraph/graph"
    - "@intelgraph/audit"

deliverables:
  - type: service
    description: Credibility scoring and deception detection service
  - type: tests
    description: Honeytoken response drill suite
  - type: documentation
    description: Counter-deception playbook

acceptance_criteria:
  - description: Credibility scores computed for all sources
    validation: Query credibility API, verify scores present
  - description: Fabrication patterns detected
    validation: Submit known fabricated content, verify detection
  - description: Honeytoken access triggers alert
    validation: Access honeytoken, verify alert fires

estimated_effort: 5-7 days
complexity: high

related_prompts:
  - SEC-001
  - XAI-001
  - DQ-001

blueprint_path: ../blueprints/templates/service
---

# Counter-Deception Lab (Defensive Only)

## Objective

Build defensive capabilities to detect information manipulation, assess source credibility, and deploy honeytokens to identify potential infiltration or data exfiltration.

**IMPORTANT**: This is strictly a defensive capability. All techniques must comply with ethical guidelines and legal frameworks. No offensive deception operations.

## Prompt

**Produce a lab that scores source credibility, mines fabrication patterns (metadata mismatches, stylometry non-biometric), and plants honeytoken canaries with response drills. Include a counter-narrative experiment harness with explicit risk caps and measurement.**

### Core Requirements

**(a) Source Credibility Scoring**

Multi-dimensional credibility assessment:

```typescript
interface CredibilityScore {
  sourceId: string;
  overallScore: number;  // 0-100
  dimensions: {
    historicalAccuracy: number;  // Track record
    metadataConsistency: number;  // Metadata checks
    corroboration: number;  // Cross-source validation
    authorCredibility: number;  // Author reputation
    recency: number;  // Timeliness of information
  };
  flags: CredibilityFlag[];
  computedAt: Date;
}

enum CredibilityFlag {
  METADATA_MISMATCH = 'metadata_mismatch',
  UNCORROBORATED = 'uncorroborated',
  STYLOMETRY_ANOMALY = 'stylometry_anomaly',
  TEMPORAL_INCONSISTENCY = 'temporal_inconsistency',
  KNOWN_DISINFORMATION_SOURCE = 'known_disinformation_source',
  CONTENT_MANIPULATION = 'content_manipulation'
}

interface CredibilityScorer {
  // Compute credibility for source
  scoreSource(sourceId: string): Promise<CredibilityScore>;

  // Detect fabrication patterns
  detectFabrication(content: Content): Promise<FabricationAnalysis>;

  // Cross-validate with other sources
  corroborate(claim: Claim): Promise<CorroborationResult>;
}

// Example scoring logic
class CredibilityScorerImpl implements CredibilityScorer {
  async scoreSource(sourceId: string): Promise<CredibilityScore> {
    const source = await this.getSource(sourceId);

    // Historical accuracy: % of past claims verified
    const historicalAccuracy = await this.computeHistoricalAccuracy(source);

    // Metadata consistency
    const metadataScore = await this.checkMetadataConsistency(source);

    // Corroboration rate
    const corroboration = await this.computeCorroborationRate(source);

    // Author credibility
    const authorScore = await this.scoreAuthor(source.author);

    // Recency (penalty for stale sources)
    const recency = this.computeRecencyScore(source.lastUpdate);

    // Weighted average
    const overall =
      historicalAccuracy * 0.3 +
      metadataScore * 0.2 +
      corroboration * 0.3 +
      authorScore * 0.1 +
      recency * 0.1;

    return {
      sourceId,
      overallScore: overall,
      dimensions: {
        historicalAccuracy,
        metadataConsistency: metadataScore,
        corroboration,
        authorCredibility: authorScore,
        recency
      },
      flags: await this.detectFlags(source),
      computedAt: new Date()
    };
  }

  private async checkMetadataConsistency(source: Source): Promise<number> {
    const checks = [
      // EXIF data matches claimed capture date
      this.verifyEXIF(source),
      // Geolocation plausible
      this.verifyGeolocation(source),
      // Timestamp consistent with content
      this.verifyTimestamp(source)
    ];

    const results = await Promise.all(checks);
    const passRate = results.filter(r => r.passed).length / results.length;
    return passRate * 100;
  }
}
```

**(b) Fabrication Pattern Mining**

Detect anomalies indicative of manipulation:

**Metadata Mismatches**:
```typescript
interface MetadataMismatch {
  // Image EXIF vs claimed location
  exifLocationMismatch: {
    claimed: GeoPoint;
    exif: GeoPoint;
    distance: number;  // km
  };

  // Document creation date vs claimed date
  creationDateMismatch: {
    claimed: Date;
    metadata: Date;
    delta: number;  // hours
  };

  // File hash in known manipulation DB
  knownManipulation: boolean;
}

async function detectMetadataMismatches(
  content: Content
): Promise<MetadataMismatch[]> {
  const mismatches: MetadataMismatch[] = [];

  // Check image EXIF
  if (content.type === 'image') {
    const exif = await extractEXIF(content.file);
    if (exif.gps && content.metadata.location) {
      const distance = haversine(exif.gps, content.metadata.location);
      if (distance > 100) {  // >100km mismatch
        mismatches.push({
          exifLocationMismatch: {
            claimed: content.metadata.location,
            exif: exif.gps,
            distance
          }
        });
      }
    }
  }

  // Check document metadata
  if (content.type === 'document') {
    const fileMetadata = await extractFileMetadata(content.file);
    if (fileMetadata.createdAt && content.metadata.createdAt) {
      const delta = Math.abs(
        fileMetadata.createdAt.getTime() - content.metadata.createdAt.getTime()
      ) / (1000 * 60 * 60);  // hours
      if (delta > 24) {  // >24h mismatch
        mismatches.push({
          creationDateMismatch: {
            claimed: content.metadata.createdAt,
            metadata: fileMetadata.createdAt,
            delta
          }
        });
      }
    }
  }

  // Check against known manipulation DB
  const fileHash = await hashFile(content.file);
  const isKnownManipulation = await manipulationDB.contains(fileHash);
  if (isKnownManipulation) {
    mismatches.push({ knownManipulation: true });
  }

  return mismatches;
}
```

**Stylometry Analysis (Non-Biometric)**:
```typescript
// Detect anomalies in writing style (NOT for attribution)
interface StylometryAnalysis {
  averageSentenceLength: number;
  vocabularyRichness: number;  // Type-token ratio
  readabilityScore: number;  // Flesch-Kincaid
  anomalyScore: number;  // Deviation from author's baseline
}

async function analyzeStylometry(
  text: string,
  authorId: string
): Promise<StylometryAnalysis> {
  // Compute metrics
  const metrics = {
    averageSentenceLength: computeAvgSentenceLength(text),
    vocabularyRichness: computeTypeTokenRatio(text),
    readabilityScore: computeFleschKincaid(text)
  };

  // Compare to author's baseline
  const baseline = await getAuthorBaseline(authorId);
  const anomalyScore = computeDeviation(metrics, baseline);

  return { ...metrics, anomalyScore };
}

// Flag if anomaly score > 2 standard deviations
if (analysis.anomalyScore > 2.0) {
  flags.push(CredibilityFlag.STYLOMETRY_ANOMALY);
}
```

**(c) Honeytoken Canaries**

Plant decoy data to detect infiltration:

```typescript
interface Honeytoken {
  id: string;
  type: 'entity' | 'document' | 'credential';
  decoyData: any;
  createdAt: Date;
  accessLog: HoneytokenAccess[];
}

interface HoneytokenAccess {
  timestamp: Date;
  userId: string;
  ipAddress: string;
  action: string;  // 'view', 'export', 'query'
  context: any;
}

interface HoneytokenService {
  // Plant honeytoken
  plantToken(type: string, decoyData: any): Promise<Honeytoken>;

  // Check if entity is honeytoken
  isHoneytoken(entityId: string): Promise<boolean>;

  // Record access
  recordAccess(tokenId: string, access: HoneytokenAccess): Promise<void>;

  // Trigger alert on access
  onAccess(tokenId: string, handler: (access: HoneytokenAccess) => void): void;
}

// Plant honeytokens
const honeytokens = [
  // Decoy entity
  {
    id: 'e-honeytoken-001',
    type: 'entity',
    data: {
      name: 'Fabricated Person Alpha',
      type: 'Person',
      attributes: {
        // Realistic but false data
        nationality: 'Atlantis',  // Non-existent
        dob: '1990-01-01',
        clearanceLevel: 'TOP_SECRET'  // Enticing
      }
    }
  },

  // Decoy document
  {
    id: 'doc-honeytoken-001',
    type: 'document',
    data: {
      title: 'Classified Operation Canary',
      classification: 'SECRET',
      content: 'This is a honeytoken. Any access will be logged and investigated.'
    }
  },

  // Decoy credential
  {
    id: 'cred-honeytoken-001',
    type: 'credential',
    data: {
      username: 'admin_backup',
      apiKey: 'hk_decoy_12345'  // Non-functional but realistic
    }
  }
];

for (const token of honeytokens) {
  await honeytokenService.plantToken(token.type, token.data);
}

// Alert on access
honeytokenService.onAccess('*', async (access) => {
  console.error(`🚨 HONEYTOKEN ACCESSED: ${access.userId} at ${access.timestamp}`);

  // Immediate alert
  await pagerduty.trigger({
    summary: 'Honeytoken accessed - potential infiltration',
    severity: 'critical',
    details: access
  });

  // Log to audit
  await audit.log({
    event: 'honeytoken_accessed',
    ...access
  });

  // Initiate response drill
  await responseDrill.execute('honeytoken-access', access);
});
```

**(d) Response Drills**

Automated incident response workflows:

```yaml
# response-drills.yml
drills:
  - id: honeytoken-access
    name: "Honeytoken Access Response"
    trigger: honeytoken_accessed
    steps:
      - action: alert_security_team
        channels: [pagerduty, slack]

      - action: lock_user_account
        target: "${event.userId}"
        duration: 1_hour

      - action: review_recent_activity
        user: "${event.userId}"
        lookback: 7_days

      - action: generate_forensic_report
        include:
          - access_logs
          - query_history
          - export_history

      - action: notify_ombuds
        escalation: true

      - action: create_incident_ticket
        system: jira
        severity: P1
```

Execute drill:
```typescript
async function executeDrill(drillId: string, event: any): Promise<void> {
  const drill = await loadDrill(drillId);

  for (const step of drill.steps) {
    console.log(`Executing: ${step.action}`);
    await drillActions[step.action](step, event);
  }

  // Log drill execution
  await audit.log({
    event: 'response_drill_executed',
    drillId,
    trigger: event
  });
}
```

**(e) Counter-Narrative Experiment Harness (Defensive)**

Test defensive messaging with risk caps:

```typescript
interface CounterNarrativeExperiment {
  id: string;
  narrativeId: string;  // Adversarial narrative to counter
  counterNarrative: string;
  targetAudience: Audience;
  riskCaps: {
    maxReach: number;  // Max users exposed
    maxDuration: number;  // Max hours active
    approvalRequired: boolean;
  };
  metrics: {
    reach: number;
    engagement: number;
    credibilityImpact: number;
  };
}

// IMPORTANT: Require ombuds approval for experiments
async function runCounterNarrativeExperiment(
  experiment: CounterNarrativeExperiment
): Promise<ExperimentResult> {
  // Require approval
  if (experiment.riskCaps.approvalRequired) {
    const approval = await ombudsService.requestApproval(experiment);
    if (!approval.approved) {
      throw new Error('Experiment denied by ombuds');
    }
  }

  // Cap reach and duration
  const startTime = Date.now();
  let reach = 0;

  while (reach < experiment.riskCaps.maxReach &&
         (Date.now() - startTime) < experiment.riskCaps.maxDuration * 3600000) {
    // Expose counter-narrative to small cohort
    const cohort = await sampleAudience(experiment.targetAudience, 100);
    await exposeNarrative(cohort, experiment.counterNarrative);
    reach += cohort.length;

    // Measure impact
    await sleep(3600000);  // 1 hour
  }

  // Measure effectiveness
  const metrics = await measureImpact(experiment);

  return { experimentId: experiment.id, metrics };
}
```

### Deliverables Checklist

- [x] Credibility scoring service
- [x] Fabrication detection (metadata + stylometry)
- [x] Honeytoken planting system
- [x] Access alerting and logging
- [x] Response drill engine
- [x] Counter-narrative experiment harness (with safeguards)
- [x] GraphQL API for credibility scores
- [x] React UI for honeytoken management
- [x] Response drill test suite
- [x] Counter-deception playbook

### Acceptance Criteria

1. **Credibility Scoring**
   - [ ] Score 10 sources
   - [ ] Verify dimensions computed
   - [ ] Check flags detected

2. **Fabrication Detection**
   - [ ] Submit image with EXIF mismatch
   - [ ] Verify mismatch flagged
   - [ ] Check stylometry anomaly detected

3. **Honeytokens**
   - [ ] Plant honeytoken entity
   - [ ] Access honeytoken
   - [ ] Verify alert fires
   - [ ] Check response drill executes

4. **Counter-Narrative** (Optional)
   - [ ] Ombuds approves experiment
   - [ ] Run experiment with risk caps
   - [ ] Measure credibility impact

## Implementation Notes

### Ethical Guidelines

- **No Offensive Deception**: Only defensive capabilities
- **Transparency**: Honeytokens must not mislead legitimate users
- **Approval Required**: All counter-narrative experiments require ombuds approval
- **Risk Caps**: Strict limits on reach and duration

### Privacy Considerations

- Stylometry analysis must NOT be used for attribution
- Aggregate credibility scores (not user-level tracking)
- Honeytoken access logs encrypted and audited

### Known Limitations

- Metadata analysis only effective if metadata present
- Stylometry has high false positive rate
- Honeytokens can be detected by sophisticated adversaries

## References

- [MITRE ATT&CK: Deception](https://attack.mitre.org/techniques/T1562/)
- [Credibility Assessment Framework](https://www.rand.org/pubs/research_reports/RR2182.html)

## Related Prompts

- **SEC-001**: Model Abuse Watchtower (detect LLM-generated disinfo)
- **XAI-001**: XAI Integrity Overlays (explain credibility scores)
- **DQ-001**: Data Quality Dashboard (credibility as DQ dimension)
