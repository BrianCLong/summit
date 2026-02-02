# Competitive Teardown: Palantir (Foundry/Gotham/AIP)

## 1. Executive Summary: The "Superset" Strategy

**Target**: Palantir Technologies (Foundry, Gotham, AIP, Apollo)
**Core Claim**: Summit renders Palantir unnecessary by matching its core "Ontology-driven" workflows while beating it on **governance, determinism, and operability**.
**Strategy**: "Wedge → Parity → Advantage". We start by proving Summit handles the hardest part of Palantir's value prop—governed, multi-modal intelligence—with 10x better auditability and 0x lock-in.

---

## 2. Target Persona & Job-to-be-Done

*   **Persona**: Intelligence Analyst / Data Engineer / Governance Officer.
*   **Job-to-be-Done**: "Ingest messy data, map it to a semantic model (Ontology), and let non-technical users answer complex questions safely."
*   **Definition of "Done"**: An analyst gets an answer + the evidence trail, and the governance officer verifies who did what.

---

## 3. Workflow Inventory & Failure Modes

| Palantir Workflow | Summit Equivalent | Common Palantir Failure Modes | Summit "Superset" Fix |
| ----------------- | ----------------- | ----------------------------- | --------------------- |
| **Data Integration** (Foundry) | **Ingest Pipelines** | Opaque failures, long debugging loops, "magical" transformations. | Deterministic ingest, explicit provenance hashes, local reproducibility. |
| **Ontology Mapping** | **Graph Schema Definition** | Rigid ontology locks, hard to refactor. | Schema-as-code, migration-safe, versioned graph schemas. |
| **Investigation** (Gotham) | **Graph Exploration** | "Black box" query paths, hard to audit *why* a link was made. | **Evidence Budgeting**, full query audit log, deterministic traversals. |
| **Case Management** (Gotham) | **Case Fabric** | Ad-hoc notes, disconnected from graph state. | **Audit-Logged Cases**: Every entity link, comment, and status change is an immutable `AuditEvent`. |
| **AI Agents** (AIP) | **Agentic Workflow** | Hallucinations, lack of citations, "magic" tool use. | **Constraint-Aware Agents**, explicit citations, evidence-backed reasoning. |
| **Deployment** (Apollo) | **Release Orchestrator** | Heavyweight, proprietary, hard to rollback. | GitOps-native, reversible by default, evidence-gated releases. |

---

## 4. Hidden Costs & Moat Analysis

### Hidden Costs of Palantir
*   **Lock-in**: Ontology logic often lives in proprietary configs or "Workshop" apps.
*   **Opacity**: "Magical" resolution of entities makes it hard to prove *why* two records merged.
*   **Cost**: High TCO, opaque compute units.

### Moat Analysis
*   **The Ontology**: Palantir's sticky semantic layer. **Summit Strategy**: Import it. Make Summit's graph schema just as powerful but open.
*   **User Interface**: Polish. **Summit Strategy**: Don't chase pixels. Chase *workflow speed* and *reliability*.
*   **Integration**: Connectors. **Summit Strategy**: Use open standards (Airbyte, dbt, etc.) + specialized Summit connectors.

---

## 5. Summit Positioning: The "Governed Superset"

### 5.1 Evidence-First Runtime
Every Summit run emits deterministic evidence artifacts:
*   `reports/palantir/report.json`: Findings summary.
*   `reports/palantir/metrics.json`: Performance & Cost data.
*   `reports/palantir/stamp.json`: Cryptographic proof of execution (Input Hash + Config Hash + Git SHA).

### 5.2 Policy Drift Detection
Summit runs "Drift Detectors" (`scripts/monitoring/palantir-drift.sh`) that replay canonical investigations. If results diverge or costs spike, the build fails.

### 5.3 Deny-by-Default Security
Summit enforces "Deny-by-Default" for network access and tool use. Agents cannot "improvise" network calls; they must use registered, policy-gated tools.

---

## 6. Execution Plan (The "PR Stack")

1.  **Docs & Assumptions**: Establish this teardown and standards mapping.
2.  **Evidence**: Implement `summit/evidence/palantir.py` to write deterministic artifacts.
3.  **Interop**: Build `summit/integrations/palantir.py` to import Ontology/Configs.
4.  **Security**: Add `tests/test_palantir_security.py` to prove "Deny-by-Default".
5.  **Perf**: Add `scripts/bench/palantir.py` to measure and cap resource usage.
6.  **Ops**: Add `scripts/monitoring/palantir-drift.sh` to ensure long-term stability.

---

## Appendix: Original "Superset Plan" (Context)

### Summit Readiness Assertion Alignment
This plan is executed under the Summit Readiness Assertion as the governing readiness baseline for competitive feature subsumption and verification sequencing.

### Feature Superset Map

#### Foundry Superset (Data + Analytics + Governance)
- **Evidence-Backed Data Integration**: Ingest pipelines emit provenance hashes and policy attestations at each stage.
- **Deterministic Lineage Graph**: Lineage is queryable, ordered, and immutable with evidence budget constraints.

#### Gotham Superset (Intel + Investigation Workflows)
- **Access-Controlled Case Fabric**: Case state transitions require policy checks and emit provenance logs.
- **Investigation-Grade Link Analysis**: Evidence-budgeted graph queries with deterministic ordering.

#### AIP Superset (AI Agents + Assistants)
- **Ontology-Aware Agents**: Agents can read, propose, and execute on ontology objects with governance gates.
- **Evidence-Bound Reasoning**: LLM outputs are traceable to source evidence.

#### Apollo Superset (Deployment + Ops)
- **Continuous Compliance Deployments**: Policy checks before deployment, during rollout, and post-deploy.
- **Recall & Rollback by Design**: Automated recall triggers and rollback automation.

### MAESTRO Security Alignment
- **Threats Considered**: Prompt injection, tool abuse, policy bypass attempts, provenance tampering.
- **Mitigations**: Policy-as-code enforcement, evidence hashing, deterministic queries, audit logging.
