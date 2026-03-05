# Summit GA Exit Criteria (v1.0)

> **Status:** Candidate Gate Definition  
> **Authority:** Release Captain + Governance Council  
> **Purpose:** Convert roadmap progress into a binary GA release decision with auditable evidence.

## GA Definition (Summit)

General Availability means Summit can be deployed in production to deliver repeatable intelligence workflows with verifiable outputs, governance controls, and operational reliability.

GA is not feature completeness. GA is reliability, reproducibility, and trust.

---

## 1) Core Platform Stability Criteria

### 1.1 Reproducible Builds

**Exit Requirements**
- Deterministic builds through CI/CD.
- Artifact hashing and provenance attached to each release.
- SBOM generated per release.

**Acceptance Test**
- Clean environment build produces identical artifact hashes.

**Status:** 🟡 In progress

### 1.2 Schema and Contract Freeze

**Exit Requirements**
- Agent interface contracts frozen for v1.
- Knowledge graph schema versioned.
- Backward compatibility rules defined.

**Acceptance Test**
- v1 agents interoperate with v1.x without modification.

**Status:** 🔴 Needs formal freeze

### 1.3 Observability and Telemetry

**Exit Requirements**
- Centralized logging across agents.
- Dashboard visibility for latency, cost per workflow, and success/failure rates.

**Acceptance Test**
- End-to-end workflow run publishes metrics and logs to dashboards.

**Status:** 🟡 Partial

---

## 2) Intelligence Workflow Readiness

### 2.1 Mission Workflow Templates

**Exit Requirements**
- Three packaged workflows available out of the box:
  1. OSINT investigation workflow
  2. Entity network analysis workflow
  3. Evidence bundle generation workflow

**Acceptance Test**
- New user runs each template and produces usable output without custom setup.

**Status:** 🔴 Not fully packaged

### 2.2 Evidence-Grade Output

**Exit Requirements**
- Outputs include provenance and chain-of-custody metadata.
- Export formats include PDF, JSON, and CSV.

**Acceptance Test**
- Output package passes traceability audit review.

**Status:** 🟡 Near-ready

---

## 3) Governance and Trust Controls

### 3.1 Policy Enforcement (OPA)

**Exit Requirements**
- Policy engine is active in enforce mode.
- Deny/allow decisions are logged.
- Role-based access controls are enforced.

**Acceptance Test**
- Unauthorized action is blocked and written to policy audit logs.

**Status:** 🟡 Partial

### 3.2 Audit Bundle Generation

**Exit Requirements**
- One-click export package includes:
  - SBOM
  - Provenance logs
  - Policy decision logs
  - Workflow trace

**Acceptance Test**
- Independent reviewer can reconstruct the decision path from export only.

**Status:** 🔴 Not packaged

### 3.3 Compliance Mapping (Minimum)

**Exit Requirements**
- Control mapping compiled for:
  - NIST AI RMF
  - ISO 27001 subset
  - CJIS-aligned logging practices

**Acceptance Test**
- Control matrix document is complete and review-ready.

**Status:** 🔴 Not compiled

---

## 4) Performance and Reliability Criteria

### 4.1 Workflow Reliability

**Exit Requirements**
- At least 95% workflow completion success rate.
- Graceful failure handling with actionable diagnostics.

**Acceptance Test**
- In 100 workflow runs, at least 95 complete successfully.

**Status:** 🔴 Not benchmarked

### 4.2 Cost and Latency Benchmarks

**Exit Requirements**
- Reproducible benchmark suite documenting:
  - Cost per workflow
  - Latency distribution

**Acceptance Test**
- Benchmark outputs are reproducible across environments.

**Status:** 🔴 Not formalized

---

## 5) Security Criteria

### 5.1 Secrets and Key Management

**Exit Requirements**
- No secrets committed in source control.
- Secure key storage with rotatable credentials.

**Acceptance Test**
- Security scans pass without critical findings.

**Status:** 🟡 Partial

### 5.2 Supply Chain Integrity

**Exit Requirements**
- Signed release artifacts.
- Dependency vulnerability scanning enforced.

**Acceptance Test**
- No unresolved critical CVEs in release path.

**Status:** 🟡 Near-ready

---

## 6) Deployment Readiness

### 6.1 Supported Deployment Targets

**Exit Requirements**
- At least one production deployment path is validated:
  - AWS (primary)
  - Optional: GCP or on-prem

**Acceptance Test**
- Fresh deployment completes in under 1 hour using documented steps.

**Status:** 🟡 Close

### 6.2 Runbooks and Operations

**Exit Requirements**
- Runbooks for deployment, rollback, incident response, and scaling.

**Acceptance Test**
- Operator can recover the system from injected failure using runbook only.

**Status:** 🔴 Needs completion

---

## 7) User Readiness Criteria

### 7.1 Role-Based UX

**Exit Requirements**
- At minimum, Analyst and Administrator role experiences are packaged and enforced.

**Acceptance Test**
- Permission boundaries are visible and enforced in UX and APIs.

**Status:** 🔴 Not packaged

### 7.2 Time-to-Value

**Exit Requirements**
- New user reaches first meaningful output in under 15 minutes.

**Acceptance Test**
- Moderated user test confirms time-to-value target.

**Status:** 🔴 Not validated

---

## 8) Documentation Criteria

### 8.1 Required GA Documentation Set

The following documents must exist and remain current:
- Architecture overview
- Deployment guide
- Workflow guide
- Governance and trust model
- API reference
- Security practices

**Status:** 🟡 Partial

---

## 9) GA Exit Scorecard Rule

Summit reaches GA when:
- All red criteria move to yellow or green.
- No critical security gaps remain open.
- The three required workflows are repeatable.
- Evidence bundles are audit-ready.
- Deployment is reproducible.

---

## 10) GA Readiness Index

| Category | Weight | Current | GA Target |
| --- | ---: | ---: | ---: |
| Platform Stability | 20% | 70 | 90 |
| Workflows | 20% | 60 | 90 |
| Governance | 20% | 75 | 95 |
| Security | 15% | 70 | 90 |
| Deployment | 15% | 65 | 90 |
| UX and Docs | 10% | 55 | 85 |

- **Current Composite:** ~66
- **GA Threshold:** 90

---

## 11) GA Unlock Outcomes

After GA, Summit is positioned to:
- Support enterprise pilots at production confidence.
- Enter government procurement pathways.
- Defend credibility against incumbent enterprise intelligence platforms.
- Publish externally defensible performance benchmarks.
- Sustain premium pricing through trust and reliability proofs.

---

## 12) Suggested Execution Timeline

- **Day 0-30:** Workflow packaging + schema freeze
- **Day 31-60:** Audit bundles + benchmark formalization
- **Day 61-90:** Compliance mapping + pilot launch readiness

Target: GA achievable in approximately 90 days with focused execution.

---

## 13) Highest-Leverage Next Step

Define and lock the three GA workflows first, because they simultaneously drive packaging, UX, telemetry, and evidence bundle quality.
