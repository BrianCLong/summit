# Threat Intelligence Backlog (2026-01-22)

**Source**: 2026-01-22 Research Update & CVE-2026-21858

## P0: Critical Security (Immediate Action)

- [x] **[SEC-CI-001] Implement n8n Version Gate**
  - **Goal**: Block deployment of vulnerable n8n versions (< 1.121.0).
  - **Action**: Created `scripts/ci/verify_n8n_safe.sh`.
  - **Status**: **Completed**.

- [ ] **[SEC-OPS-001] Rotate n8n Credentials**
  - **Goal**: Invalidate potential compromised keys in self-hosted n8n instances.
  - **Owner**: DevOps / Security
  - **Runbook**: See [runbooks/n8n-credential-rotation.md](../runbooks/n8n-credential-rotation.md)
  - **Acceptance Criteria**: All GitHub PATs, AI API keys, and Database credentials used in n8n are rotated.
  - **Status**: Runbook created 2026-02-06, awaiting execution by DevOps.

## P1: Structural Hardening (Sprint N+7)

- [ ] **[DET-SYN-001] Implement Synthetic Amplification Detector**
  - **Goal**: Detect AI-driven "High Velocity / Low Variance" content.
  - **Spec**: See `policy/detection/rules/synthetic_amplification.yaml`.
  - **Owner**: Influence Operations Team

- [ ] **[MOD-NAR-001] Expand Narrative Domain Model**
  - **Goal**: Support "Economic" and "Market" domains in Narrative Engine.
  - **Action**: Update `NarrativeDomain` enum in `packages/narrative-engine`.
  - **Owner**: Backend Eng

## P2: Research & Future Coverage

- [ ] **[RES-BEND-001] Train BEND Framing Classifier**
  - **Goal**: Automated classification of narrative steps into BEND categories (Backing, Explanation, etc.).
  - **Dependency**: Collection of labeled dataset.

- [ ] **[RES-CORR-001] Cross-Domain Correlation Engine**
  - **Goal**: Correlate political narrative peaks with market volatility.
  - **Status**: Research Phase.
