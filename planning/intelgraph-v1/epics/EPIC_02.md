# EPIC 2 — Graph & Data Modeling

**Goal**: Implement a canonical, sovereign graph schema with high-fidelity provenance and encryption.

**Architecture Reference**:
```mermaid
graph LR\n    A[Raw Data] --> B[Ontology Mapping]\n    B --> C[Neo4j Node/Edge]\n    C --> D[Postgres Anchor]\n    D --> E[Field Encryption]\n    E --> F[Provenance Ledger]
```

**Constraints**: Align with Org Defaults (SLOs, Cost, Privacy).

### Risk Matrix
| Risk | Impact | Mitigation |
|---|---|---|
| Technical Debt | Medium | Regular refactoring blocks. |
| Resource Constraint | High | Parallel execution with modular agents. |

### Task: Canonical Ontology Definition
- **Description**: Implementation and validation of Canonical Ontology Definition for the IntelGraph platform.
- **Subtasks**:
  - Define Entity/Edge types
  - Review with Data Working Group
  - Publish schema spec
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Schema Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Ontology doc published
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check `docs/ontology.md`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Neo4j Schema Design
- **Description**: Implementation and validation of Neo4j Schema Design for the IntelGraph platform.
- **Subtasks**:
  - Define constraints and indexes
  - Implement node labels
  - Optimize relationship types
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Schema Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Constraints enforced
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `:schema` in Cypher
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: PostgreSQL Relational Anchors
- **Description**: Implementation and validation of PostgreSQL Relational Anchors for the IntelGraph platform.
- **Subtasks**:
  - Design relational metadata tables
  - Setup foreign keys to graph
  - Verify query performance
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Schema Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Tables created with FKs
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `psql \\d`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Field-level Encryption
- **Description**: Implementation and validation of Field-level Encryption for the IntelGraph platform.
- **Subtasks**:
  - Setup AWS KMS integration
  - Implement encryption middleware
  - Verify zero-knowledge queries
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Crypto Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - PII encrypted in storage
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:encryption`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Residency Tagging
- **Description**: Implementation and validation of Residency Tagging for the IntelGraph platform.
- **Subtasks**:
  - Implement geo-tagging at ingest
  - Verify residency policy enforcement
  - Audit data placement
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Policy Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Residency metadata present
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Query for `residency` tag
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Retention Tier Enforcement
- **Description**: Implementation and validation of Retention Tier Enforcement for the IntelGraph platform.
- **Subtasks**:
  - Define TTL rules
  - Implement automated deletion worker
  - Verify storage reclamation
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Compliance Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Data deleted after TTL
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check deletion logs
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Purpose Tagging Model
- **Description**: Implementation and validation of Purpose Tagging Model for the IntelGraph platform.
- **Subtasks**:
  - Define use-case categories
  - Implement tagging API
  - Verify audit trail
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Purpose tags required
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `jest test:purpose`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: Claim/Evidence Graph Model
- **Description**: Implementation and validation of Claim/Evidence Graph Model for the IntelGraph platform.
- **Subtasks**:
  - Design evidence nodes
  - Implement trust-score edges
  - Verify lineage pathing
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: AI Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Evidence linked to claims
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Query for `EVIDENCE_OF`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Provenance Ledger Schema
- **Description**: Implementation and validation of Provenance Ledger Schema for the IntelGraph platform.
- **Subtasks**:
  - Define append-only ledger format
  - Integrate with Neo4j
  - Verify tamper-evidence
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Crypto Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Ledger is immutable
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run integrity check CLI
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Entity Resolution Strategy
- **Description**: Implementation and validation of Entity Resolution Strategy for the IntelGraph platform.
- **Subtasks**:
  - Design probabilistic matching
  - Implement gold-record logic
  - Verify dedupe accuracy
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: AI Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Accuracy > 95%
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `pnpm benchmark:er`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Deduplication Pipeline
- **Description**: Implementation and validation of Deduplication Pipeline for the IntelGraph platform.
- **Subtasks**:
  - Implement blocking keys
  - Setup worker for record linkage
  - Verify merge logic
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Duplicate pairs resolved
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check dedupe logs
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Index Strategy
- **Description**: Implementation and validation of Index Strategy for the IntelGraph platform.
- **Subtasks**:
  - Audit slow queries
  - Create composite indexes
  - Verify performance gains
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Query time < 100ms
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check Cypher profile
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Query Cost Hints
- **Description**: Implementation and validation of Query Cost Hints for the IntelGraph platform.
- **Subtasks**:
  - Implement GQL cost analysis
  - Inject hints into Neo4j
  - Verify latency reduction
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: Schema Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Cost limits enforced
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check GQL complexity
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: Migration Framework
- **Description**: Implementation and validation of Migration Framework for the IntelGraph platform.
- **Subtasks**:
  - Implement schema versioning tool
  - Setup up/down scripts
  - Verify migration safety
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: DevOps Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Migrations are reversible
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `pnpm migrate:down`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Data Minimization Rules
- **Description**: Implementation and validation of Data Minimization Rules for the IntelGraph platform.
- **Subtasks**:
  - Audit PII fields
  - Implement auto-stripping of unused data
  - Verify compliance
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Policy Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Only necessary data stored
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run PII scan
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: License/TOS Classification
- **Description**: Implementation and validation of License/TOS Classification for the IntelGraph platform.
- **Subtasks**:
  - Define license metadata
  - Implement check at query time
  - Verify embargo logic
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - License enforced at query
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:license`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: Embargo Handling
- **Description**: Implementation and validation of Embargo Handling for the IntelGraph platform.
- **Subtasks**:
  - Design timed release system
  - Implement access control on embargoed nodes
  - Verify reveal automation
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Embargo strictly enforced
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run embargo test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: Export Manifest Format
- **Description**: Implementation and validation of Export Manifest Format for the IntelGraph platform.
- **Subtasks**:
  - Design JSON-LD export
  - Verify integrity hash generation
  - Audit export logs
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Compliance Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Exports are verifiable
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `summit-verify`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Task: Schema Versioning
- **Description**: Implementation and validation of Schema Versioning for the IntelGraph platform.
- **Subtasks**:
  - Implement semantic versioning for GQL
  - Setup deprecation warnings
  - Verify backward compatibility
- **Assigned Agent**:
  - Primary: Backend Agent
  - Optional Subagents: Architecture Agent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - V1 and V2 co-exist
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run parity test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Backend Policy.

### Task: Backfill Plan
- **Description**: Implementation and validation of Backfill Plan for the IntelGraph platform.
- **Subtasks**:
  - Design migration path for legacy data
  - Implement batch re-ingest
  - Verify data parity
- **Assigned Agent**:
  - Primary: Data Agent
  - Optional Subagents: Migration Subagent
- **Dependencies**: Epic 2 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - 100% data backfilled
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check backfill counts
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Data Policy.

### Parallelization Map
All tasks in this epic can run in parallel following the foundational architecture setup.

### Critical Path
Foundational ADR -> Core Implementation -> Policy Verification -> Go-Live.

### Rollback Strategy
Revert to previous stable tag; restore DB snapshots if schema change was involved.
