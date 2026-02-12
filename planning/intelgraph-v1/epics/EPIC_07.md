# EPIC 7 — Security, Privacy & Compliance

**Goal**: Enforce least-privilege access, data classification, and automated RTBF.

**Architecture Reference**:
```mermaid
graph LR\n    A[Data Class] --> B[OPA Policy]\n    B --> C[Field Redaction]\n    C --> D[K-Anonymity]\n    D --> E[Immutable Audit]
```

**Constraints**: Align with Org Defaults (SLOs, Cost, Privacy).

### Risk Matrix
| Risk | Impact | Mitigation |
|---|---|---|
| Technical Debt | Medium | Regular refactoring blocks. |
| Resource Constraint | High | Parallel execution with modular agents. |

### Task: Threat Model (STRIDE)
- **Description**: Implementation and validation of Threat Model (STRIDE) for the IntelGraph platform.
- **Subtasks**:
  - Identify attack vectors
  - Define mitigation strategy
  - Review with SecOps
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Policy Subagent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Threat model approved
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check `docs/security/threat-model.md`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Abuse Case Catalog
- **Description**: Implementation and validation of Abuse Case Catalog for the IntelGraph platform.
- **Subtasks**:
  - Define malicious user scenarios
  - Implement detection rules
  - Verify response
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Abuse detected in logs
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run abuse simulation
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: OPA Policy Library
- **Description**: Implementation and validation of OPA Policy Library for the IntelGraph platform.
- **Subtasks**:
  - Write rego for all services
  - Setup policy CI gate
  - Verify rule coverage
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Policy Subagent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Zero unauthorized access
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `conftest`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Data Classification Mapping
- **Description**: Implementation and validation of Data Classification Mapping for the IntelGraph platform.
- **Subtasks**:
  - Tag all DB fields
  - Implement classification API
  - Verify tagging accuracy
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Compliance Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Sensitive data identified
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run classification scan
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Encryption Standards
- **Description**: Implementation and validation of Encryption Standards for the IntelGraph platform.
- **Subtasks**:
  - Enforce AES-256-GCM
  - Setup TLS 1.3 only
  - Verify compliance
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Architecture Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Strong encryption enforced
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `ssllabs` test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Field Redaction System
- **Description**: Implementation and validation of Field Redaction System for the IntelGraph platform.
- **Subtasks**:
  - Implement masking middleware
  - Setup role-based redaction
  - Verify output
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - PII redacted for non-admins
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run `test:redaction`
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: k-anonymity Export Guard
- **Description**: Implementation and validation of k-anonymity Export Guard for the IntelGraph platform.
- **Subtasks**:
  - Implement noise injection
  - Setup threshold checks
  - Verify anonymity
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Data is anonymized
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run anonymity test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Legal Hold Mechanism
- **Description**: Implementation and validation of Legal Hold Mechanism for the IntelGraph platform.
- **Subtasks**:
  - Implement data freeze flag
  - Setup storage lock
  - Verify non-deletability
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Held data cannot be deleted
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run hold test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: RTBF Automation
- **Description**: Implementation and validation of RTBF Automation for the IntelGraph platform.
- **Subtasks**:
  - Implement deletion workflow
  - Setup compliance logging
  - Verify data removal
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Data Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - RTBF completed < 30 days
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run RTBF drill
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: Warrant/Authority Binding
- **Description**: Implementation and validation of Warrant/Authority Binding for the IntelGraph platform.
- **Subtasks**:
  - Implement metadata link to warrants
  - Setup authorization gateway
  - Verify legally-backed access
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Access requires warrant ID
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run warrant test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: SCIM Integration
- **Description**: Implementation and validation of SCIM Integration for the IntelGraph platform.
- **Subtasks**:
  - Setup Okta/Azure SCIM
  - Implement user provisioning
  - Verify sync
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: DevOps Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Users synced automatically
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check SCIM logs
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Session Management
- **Description**: Implementation and validation of Session Management for the IntelGraph platform.
- **Subtasks**:
  - Implement JWT rotation
  - Setup absolute/idle timeouts
  - Verify revocation
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Backend Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Sessions are secure
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run session test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: mTLS Cert Rotation
- **Description**: Implementation and validation of mTLS Cert Rotation for the IntelGraph platform.
- **Subtasks**:
  - Setup cert-manager/vault
  - Implement auto-renewal
  - Verify zero-downtime
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: DevOps Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Certs rotate weekly
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check cert expiry
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Secrets Rotation Policy
- **Description**: Implementation and validation of Secrets Rotation Policy for the IntelGraph platform.
- **Subtasks**:
  - Setup automated RDS/API rotation
  - Implement app reload logic
  - Verify connectivity
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: DevOps Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Zero stale secrets
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check rotation logs
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Audit Log Immutability
- **Description**: Implementation and validation of Audit Log Immutability for the IntelGraph platform.
- **Subtasks**:
  - Setup S3 Object Lock
  - Implement hash chain for logs
  - Verify WORM storage
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Compliance Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Logs cannot be altered
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run tamper test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Privacy Impact Assessment
- **Description**: Implementation and validation of Privacy Impact Assessment for the IntelGraph platform.
- **Subtasks**:
  - Automate PIA questionnaire
  - Implement risk scoring
  - Verify mitigation
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Security Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - PIA completed for all data
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Check PIA reports
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: Residency Compliance Rules
- **Description**: Implementation and validation of Residency Compliance Rules for the IntelGraph platform.
- **Subtasks**:
  - Write OPA rules for geo-fencing
  - Implement residency checks
  - Verify data placement
- **Assigned Agent**:
  - Primary: Compliance Agent
  - Optional Subagents: Policy Subagent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Data stays in region
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run residency test
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Compliance Policy.

### Task: Breach Response Playbook
- **Description**: Implementation and validation of Breach Response Playbook for the IntelGraph platform.
- **Subtasks**:
  - Define IR steps
  - Automate notification logic
  - Verify playbook readiness
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: SRE Agent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Response ready in < 4h
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run IR drill
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Task: Policy Simulation Harness
- **Description**: Implementation and validation of Policy Simulation Harness for the IntelGraph platform.
- **Subtasks**:
  - Implement 'what-if' policy tester
  - Setup regression testing
  - Verify policy impact
- **Assigned Agent**:
  - Primary: Security Agent
  - Optional Subagents: Policy Subagent
- **Dependencies**: Epic 7 foundational architecture.
- **Risk Tag**: Medium
- **Acceptance Criteria**:
  - Zero unexpected blocks
  - Unit test coverage > 85%.
- **Verification Steps**:
  - Run policy simulation
  - Audit logs verify correct agent execution.
- **Observability Hooks**: Prometheus metrics, structured logs.
- **Policy Impact**: Governed by Org Default Security Policy.

### Parallelization Map
All tasks in this epic can run in parallel following the foundational architecture setup.

### Critical Path
Foundational ADR -> Core Implementation -> Policy Verification -> Go-Live.

### Rollback Strategy
Revert to previous stable tag; restore DB snapshots if schema change was involved.
