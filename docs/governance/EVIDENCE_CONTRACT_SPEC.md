# Evidence Contract Specification

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2026-03-11
**Schema Version:** 1.0.0

---

## Overview

This document defines the evidence contract standards for Summit's control-plane primitives. Evidence contracts ensure that automated systems produce deterministic, auditable, schema-compliant artifacts suitable for governance and compliance requirements.

## Principles

### 1. Determinism

**Requirement**: Given the same input state and source commit, evidence generation MUST produce identical deterministic reports (excluding timestamps and ephemeral metadata).

**Rationale**: Enables reproducibility, auditability, and verification of control decisions.

### 2. Timestamp Separation

**Requirement**: Evidence artifacts MUST separate deterministic content from non-deterministic timestamps.

**Implementation**:
- **report.json**: Deterministic, schema-compliant, no timestamps
- **stamp.json**: Non-deterministic metadata (timestamps, generation time)

**Rationale**: Allows content-addressable storage, diffing, and verification without timestamp noise.

### 3. Source Traceability

**Requirement**: Every evidence artifact MUST include:
- Full git commit SHA (40 characters)
- Branch name at generation time
- Unique evidence ID

**Rationale**: Enables chain-of-custody tracking and source state reconstruction.

### 4. Schema Compliance

**Requirement**: All evidence artifacts MUST validate against a versioned JSON Schema.

**Rationale**: Ensures machine-readability, contract enforcement, and schema evolution management.

---

## Evidence Artifact Structure

### Standard Artifact Pair

Every evidence-generating system produces two files:

#### report.json (Deterministic)

**Purpose**: Primary evidence artifact
**Characteristics**:
- Schema-compliant
- No timestamps
- Reproducible (same input → same output)
- Content-addressable

**Required Fields**:
\`\`\`json
{
  "schemaVersion": "1.0.0",
  "evidenceId": "system-[0-9a-f]{8}",
  "sourceCommit": "[0-9a-f]{40}",
  "sourceBranch": "string",
  // ... system-specific fields
}
\`\`\`

#### stamp.json (Non-Deterministic)

**Purpose**: Temporal metadata
**Characteristics**:
- Timestamps and generation metadata
- Links to report via evidenceId
- Not used for content verification

**Required Fields**:
\`\`\`json
{
  "timestamp": "2026-03-11T05:30:00.000Z",
  "generatedAt": 1773210600000,
  "reportId": "system-[0-9a-f]{8}",
  "schemaVersion": "1.0.0"
}
\`\`\`

---

## Evidence ID Format

### Pattern

\`\`\`
<system-type>-<hex-digest>
\`\`\`

Where:
- \`<system-type>\`: One of \`entropy\`, \`resurrection\`, \`calibration\`
- \`<hex-digest>\`: 8-character hexadecimal (32 bits entropy minimum)

### Examples

- \`entropy-a1cc776c\`
- \`resurrection-b8c9f454\`
- \`calibration-d019ac84\`

---

## Artifact Storage Conventions

### Directory Structure

\`\`\`
artifacts/
├── repoos/
│   ├── frontier-entropy/
│   │   ├── report.json
│   │   ├── stamp.json
│   │   └── state.json
│   └── entropy-calibration/
│       ├── report.json
│       └── stamp.json
└── history-quick/
    ├── report.json
    └── stamp.json
\`\`\`

### Naming Conventions

- **Deterministic reports**: Always \`report.json\`
- **Timestamp stamps**: Always \`stamp.json\`
- **System state**: \`state.json\` (optional, persistent state)

### Retention

- **Evidence artifacts**: 90 days minimum (configurable per system)
- **Audit logs**: 90 days minimum, immutable

---

## Evidence Admissibility Criteria

For evidence to be admissible in governance processes:

### 1. Schema Compliance
✅ **MUST** validate against declared schema version
✅ **MUST** include schemaVersion field

### 2. Source Traceability
✅ **MUST** include valid 40-character git commit SHA
✅ **MUST** include source branch name
✅ **MUST** include unique evidence ID

### 3. Reproducibility
✅ **MUST** produce identical deterministic report on re-run (same source state)
✅ **MUST** separate timestamps into stamp.json

---

## System-Specific Schemas

### Entropy Report Schema

**Location**: \`schemas/evidence/entropy-report.schema.json\`
**Version**: 1.0.0
**System**: Frontier Entropy Monitor

**Key Fields**:
- \`entropy\`: Current entropy value, velocity, acceleration, assessment
- \`velocity\`: Current, average, confidence
- \`prediction\`: Status, time band, confidence
- \`assessment\`: Level, recommendation, control actions

### Resurrection Report Schema

**Location**: \`schemas/evidence/resurrection-report.schema.json\`
**Version**: 1.0.0
**System**: Historical Resurrection System

**Key Fields**:
- \`summary\`: Total commits, concerns, files impacted, entropy, lanes
- \`concerns\`: Concern clusters with commit lists
- \`topFiles\`: Most frequently touched files
- \`candidates\`: Resurrection candidates with lane assignments

---

## Validation

### Schema Validation

**Tools**: Use ajv (JSON Schema validator) or equivalent

**Example**:
\`\`\`bash
# Install ajv-cli
npm install -g ajv-cli

# Validate entropy report
ajv validate \\
  -s schemas/evidence/entropy-report.schema.json \\
  -d artifacts/repoos/frontier-entropy/report.json
\`\`\`

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-11 | Initial evidence contract specification |

---

**END OF DOCUMENT**
