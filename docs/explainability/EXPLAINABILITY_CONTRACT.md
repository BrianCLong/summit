# Explainability Contract

**Version**: 1.0.0
**Status**: Authoritative
**Effective**: 2025-12-31
**Owner**: Explainability & Provenance Team

---

## Purpose

This document defines the **authoritative data contract** for all explainability surfaces in Summit. Every UI, API, CLI, and audit interface that presents explainability artifacts MUST comply with this contract.

**Non-negotiables**:
- All explainable entities expose these fields
- All consumer interfaces (UI/API/CLI) rely on this schema
- Stable IDs enable cross-system linkage (UI ↔ audit log ↔ provenance ↔ SBOM)
- Redaction rules are uniform and mandatory

---

## Common Schema

### 1. Explainable Run

Every agent run, prediction, or negotiation that requires explanation MUST implement this schema:

```typescript
interface ExplainableRun {
  // Identity & Context
  run_id: string;                    // Stable UUID linking to audit logs
  run_type: RunType;                 // 'agent_run' | 'prediction' | 'negotiation' | 'policy_decision'
  tenant_id: string;                 // Tenant isolation (REQUIRED)
  actor: ActorInfo;                  // Who/what initiated this run

  // Temporal
  started_at: string;                // ISO 8601 timestamp
  completed_at: string | null;       // null if still running
  duration_ms: number | null;        // null if still running

  // Inputs (redacted)
  inputs: ExplainableInputs;         // See Input Schema below

  // Outputs (redacted)
  outputs: ExplainableOutputs;       // See Output Schema below

  // Explanation
  explanation: Explanation;          // Why this ran and how

  // Confidence & Limits
  confidence: ConfidenceMetrics;     // Trust signals
  assumptions: Assumption[];         // What was assumed
  limitations: Limitation[];         // Known weaknesses

  // Policy & Governance
  policy_decisions: PolicyDecision[]; // Allow/deny decisions
  capabilities_used: string[];       // Which capabilities were invoked

  // Lineage & Provenance
  provenance_links: ProvenanceLinks; // Links to artifacts, SBOM, claims
  parent_run_id: string | null;      // If nested/chained
  child_run_ids: string[];           // If spawned child runs

  // Audit Trail
  audit_event_ids: string[];         // Immutable audit events

  // Metadata
  version: string;                   // Schema version (semver)
  redacted_fields: string[];         // List of redacted field paths
}
```

---

### 2. Actor Information

```typescript
interface ActorInfo {
  actor_type: 'human' | 'agent' | 'system' | 'service';
  actor_id: string;                  // User ID, agent ID, service name
  actor_name: string;                // Human-readable name
  actor_role: string | null;         // RBAC role (if applicable)
  authentication_method: string;     // 'oauth2' | 'api_key' | 'mtls' | 'service_account'
}
```

---

### 3. Inputs Schema

```typescript
interface ExplainableInputs {
  // Raw inputs (may be redacted)
  parameters: Record<string, any>;   // Key-value pairs

  // Cryptographic integrity
  input_hash: string;                // SHA-256 of canonicalized inputs
  hashing_algorithm: 'sha256' | 'sha3-256';

  // Redaction metadata
  pii_fields_redacted: string[];     // Paths to PII fields (e.g., 'parameters.email')
  secret_fields_redacted: string[];  // Paths to secrets (e.g., 'parameters.api_key')

  // Source tracking
  input_sources: InputSource[];      // Where inputs came from
}

interface InputSource {
  source_type: 'user_input' | 'database' | 'api' | 'file' | 'environment';
  source_id: string;                 // Database record ID, file path, API endpoint
  retrieved_at: string;              // ISO 8601 timestamp
}
```

---

### 4. Outputs Schema

```typescript
interface ExplainableOutputs {
  // Raw outputs (may be redacted)
  results: Record<string, any>;      // Key-value pairs

  // Cryptographic integrity
  output_hash: string;               // SHA-256 of canonicalized outputs
  hashing_algorithm: 'sha256' | 'sha3-256';

  // Redaction metadata
  pii_fields_redacted: string[];     // Paths to PII fields
  secret_fields_redacted: string[];  // Paths to secrets

  // Artifacts produced
  artifacts: ArtifactReference[];    // Files, reports, claims generated

  // Side effects
  side_effects: SideEffect[];        // Mutations, external calls
}

interface ArtifactReference {
  artifact_id: string;               // Stable ID
  artifact_type: 'file' | 'claim' | 'evidence' | 'report' | 'sbom';
  artifact_uri: string;              // Storage location (may be redacted)
  artifact_hash: string;             // Content hash
  created_at: string;                // ISO 8601 timestamp
  provenance_chain_id: string | null; // Link to provenance chain
}

interface SideEffect {
  effect_type: 'database_write' | 'api_call' | 'file_write' | 'message_sent';
  target: string;                    // Table name, API endpoint, file path
  action: string;                    // INSERT, UPDATE, DELETE, POST, etc.
  timestamp: string;                 // ISO 8601 timestamp
  reversible: boolean;               // Can this be undone?
}
```

---

### 5. Explanation Schema

```typescript
interface Explanation {
  // Human-readable summary
  summary: string;                   // 1-2 sentences: what happened and why

  // Reasoning trace
  reasoning_steps: ReasoningStep[];  // Step-by-step logic

  // Decision rationale
  why_triggered: string;             // Why this run occurred
  why_this_approach: string;         // Why this method was chosen

  // Alternative paths
  alternatives_considered: Alternative[]; // Other options evaluated
}

interface ReasoningStep {
  step_number: number;
  description: string;               // What happened in this step
  inputs: string[];                  // Input references
  outputs: string[];                 // Output references
  confidence: number;                // 0.0-1.0
  rationale: string;                 // Why this step
}

interface Alternative {
  approach: string;                  // Description of alternative
  why_not_chosen: string;            // Reason for rejection
  estimated_confidence: number | null; // 0.0-1.0 (if evaluated)
}
```

---

### 6. Confidence Metrics

```typescript
interface ConfidenceMetrics {
  // Overall confidence
  overall_confidence: number;        // 0.0-1.0
  confidence_basis: string;          // How confidence was computed

  // Evidence-based confidence
  evidence_count: number;            // How many evidence artifacts support this
  evidence_quality: 'high' | 'medium' | 'low' | 'unknown';

  // Source reliability
  source_count: number;              // How many sources used
  source_licenses: string[];         // License types of sources
  source_reliability: 'verified' | 'trusted' | 'unverified';

  // Validation
  validated: boolean;                // Has this been externally validated?
  validation_method: string | null;  // How it was validated
  validated_at: string | null;       // ISO 8601 timestamp
}
```

---

### 7. Assumptions & Limitations

```typescript
interface Assumption {
  assumption_id: string;             // Stable ID
  description: string;               // What was assumed
  risk_if_false: 'critical' | 'high' | 'medium' | 'low';
  validated: boolean;                // Has this assumption been verified?
  validation_notes: string | null;   // How it was verified (if applicable)
}

interface Limitation {
  limitation_id: string;             // Stable ID
  category: 'data_quality' | 'model_capability' | 'time_constraint' | 'resource_constraint' | 'scope';
  description: string;               // What the limitation is
  impact: 'critical' | 'high' | 'medium' | 'low';
  mitigation: string | null;         // How to address this limitation
}
```

---

### 8. Policy Decisions

```typescript
interface PolicyDecision {
  decision_id: string;               // Stable ID
  policy_name: string;               // Which policy was evaluated
  policy_version: string;            // Policy version (semver)

  // Decision outcome
  decision: 'allow' | 'deny' | 'audit_only' | 'require_approval';
  rationale: string;                 // Why this decision

  // Context
  evaluated_at: string;              // ISO 8601 timestamp
  capability_requested: string;      // What was being authorized
  risk_level: 'critical' | 'high' | 'medium' | 'low';

  // Evidence
  evidence_used: string[];           // Artifact IDs that informed decision
  override_applied: boolean;         // Was policy overridden?
  override_justification: string | null; // Why it was overridden
}
```

---

### 9. Provenance Links

```typescript
interface ProvenanceLinks {
  // Provenance chain
  provenance_chain_id: string | null; // Link to full provenance chain

  // Claims & Evidence
  claims: ClaimReference[];          // Claims made during this run
  evidence: EvidenceReference[];     // Evidence artifacts
  sources: SourceReference[];        // Data sources used
  transforms: TransformReference[];  // Transformations applied

  // SBOM & Attestations
  sbom_id: string | null;            // Software Bill of Materials
  cosign_attestations: string[];     // Cosign signature URIs

  // Merkle verification
  merkle_root: string | null;        // Merkle root of export bundle
  merkle_proof: string[] | null;     // Proof path for verification
}

interface ClaimReference {
  claim_id: string;
  claim_type: 'factual' | 'inferential' | 'predictive' | 'evaluative';
  confidence: number;                // 0.0-1.0
  supporting_evidence_count: number;
}

interface EvidenceReference {
  evidence_id: string;
  evidence_type: 'document' | 'image' | 'video' | 'log' | 'testimony' | 'sensor_data' | 'database_record';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  integrity_hash: string;
}

interface SourceReference {
  source_id: string;
  source_type: 'document' | 'database' | 'api' | 'user_input' | 'sensor';
  license: 'public' | 'internal' | 'restricted' | 'classified';
  retrieved_at: string;              // ISO 8601 timestamp
}

interface TransformReference {
  transform_id: string;
  transform_type: 'extract' | 'ocr' | 'translate' | 'normalize' | 'enrich' | 'extract_claim' | 'deduplicate' | 'classify' | 'redact';
  parent_transform_id: string | null; // Chained transforms
}
```

---

## Required Fields

### Mandatory for All Runs

```typescript
const REQUIRED_FIELDS = [
  'run_id',
  'run_type',
  'tenant_id',
  'actor',
  'started_at',
  'inputs.input_hash',
  'outputs.output_hash',
  'explanation.summary',
  'confidence.overall_confidence',
  'audit_event_ids',
  'version'
] as const;
```

### Redaction Rules

#### PII Redaction

**MUST redact** (replace with `[REDACTED:PII]`):
- Email addresses
- Phone numbers
- Physical addresses
- SSN/national ID numbers
- Biometric data
- Medical records

#### Secret Redaction

**MUST redact** (replace with `[REDACTED:SECRET]`):
- API keys
- Passwords
- OAuth tokens
- Private keys
- Database credentials
- Encryption keys

#### Redaction Metadata

When redacting, **MUST**:
1. Replace value with `[REDACTED:TYPE]`
2. Add field path to `inputs.pii_fields_redacted` or `inputs.secret_fields_redacted`
3. Update `redacted_fields` array at root level
4. **DO NOT** modify the hash (hash original, unredacted content)

**Example**:
```typescript
// Before redaction
{
  inputs: {
    parameters: { email: "user@example.com", query: "find reports" },
    input_hash: "abc123..."
  },
  redacted_fields: []
}

// After redaction
{
  inputs: {
    parameters: { email: "[REDACTED:PII]", query: "find reports" },
    input_hash: "abc123...",  // UNCHANGED - hash of original
    pii_fields_redacted: ["parameters.email"]
  },
  redacted_fields: ["inputs.parameters.email"]
}
```

---

## Stable IDs & Cross-System Linkage

### ID Format

All stable IDs MUST be:
- **UUIDs (v4)** for uniqueness
- **Immutable** once created
- **Indexed** in the database for fast lookup
- **Present in audit logs** for traceability

### Linkage Map

```
ExplainableRun.run_id
  ├─→ AuditEvent.run_id (audit trail)
  ├─→ ProvenanceChain.item_id (provenance)
  ├─→ ExportManifest.bundle_id (SBOM)
  ├─→ PolicyDecision.run_id (governance)
  └─→ Artifact.source_run_id (outputs)

Artifact.artifact_id
  ├─→ ProvenanceClaim.claim_id
  ├─→ Evidence.evidence_id
  └─→ SBOM.component_id

ProvenanceChain.provenance_chain_id
  ├─→ ExportManifest.merkle_root (verification)
  └─→ CosignAttestation.signature_uri
```

---

## API Response Format

All explainability APIs **MUST** return this envelope:

```typescript
interface ExplainabilityAPIResponse<T> {
  success: boolean;
  data: T | null;
  meta: {
    request_id: string;            // For support/debugging
    tenant_id: string;             // For audit
    queried_at: string;            // ISO 8601 timestamp
    version: string;               // API version
  };
  errors?: APIError[];             // Only if success=false
}

interface APIError {
  code: string;                    // Machine-readable error code
  message: string;                 // Human-readable message
  field?: string;                  // Field that caused error (if applicable)
}
```

---

## UI/CLI Display Requirements

### Minimum Information Display

Any UI or CLI showing an ExplainableRun **MUST** display:

1. **What ran**: `run_type`, `actor.actor_name`
2. **When**: `started_at`, `duration_ms`
3. **Why**: `explanation.summary`
4. **Confidence**: `confidence.overall_confidence`, `confidence.evidence_count`
5. **Outcome**: `outputs.results` (redacted), `side_effects`
6. **Trustworthy?**: `confidence.source_reliability`, `policy_decisions`

### Redacted Field Handling

When displaying redacted fields, UI/CLI **MUST**:
- Show `[REDACTED:TYPE]` placeholder
- Display a tooltip/note: "Redacted for [PII protection | security]"
- Provide a count: "X fields redacted"
- Link to `redacted_fields` list for transparency

---

## Versioning

This contract uses **semantic versioning**:
- **MAJOR**: Breaking changes to required fields or types
- **MINOR**: New optional fields or enhancements
- **PATCH**: Clarifications, examples, non-normative changes

**Current version**: `1.0.0`

All systems **MUST** include `version: "1.0.0"` in their ExplainableRun responses.

---

## Compliance Checklist

Before deploying any explainability interface, verify:

- [ ] Implements `ExplainableRun` schema
- [ ] Exposes all required fields
- [ ] Applies redaction rules uniformly
- [ ] Links to audit logs via `run_id`
- [ ] Links to provenance via `provenance_chain_id`
- [ ] Enforces tenant isolation
- [ ] Returns API envelope format
- [ ] Displays minimum information (UI/CLI)
- [ ] Handles redacted fields gracefully
- [ ] Includes schema version
- [ ] Documented in Evidence Pack

---

## See Also

- [Evidence Pack: Explainability](./EVIDENCE_EXPLAINABILITY.md) - Verification and examples
- [Provenance Beta Types](../../server/src/types/provenance-beta.ts) - Implementation types
- [Audit Trail Service](../../server/src/services/audit/AuditTrailService.ts) - Immutable audit
- [Export Manifest Schema](../../server/src/db/migrations/20251025_provenance_claims.sql) - Database schema

---

**Enforcement**: This contract is normative. Non-compliance blocks production deployment.
