# Evidence-Driven Certification Criteria

All certifications require **evidence**. This document outlines the control checklists and evidence requirements for each domain and level.

## 1. Governance & Compliance

| ID | Control | Baseline Evidence | Verified Evidence | Audited Evidence |
|----|---------|-------------------|-------------------|------------------|
| G-1 | Terms of Service | Signed Checkbox | Countersigned Contract | Legal Opinion |
| G-2 | Policy Adherence | Self-Attestation | Automated Policy Check Logs | Audit Report (SOC2 CC) |
| G-3 | Version Control | N/A | Git History / SHA | Immutable Ledger Entry |

## 2. Security

| ID | Control | Baseline Evidence | Verified Evidence | Audited Evidence |
|----|---------|-------------------|-------------------|------------------|
| S-1 | Vulnerability Scan | `npm audit` Log | Signed Scan Report (Trivy) | Penetration Test Report |
| S-2 | SBOM | Generated SBOM | Signed SBOM (SPDX/CycloneDX) | Verified & Provenance-Linked SBOM |
| S-3 | Secrets Mgmt | `.env.example` check | Secret Scanner Log (TruffleHog) | HSM Usage Audit |

## 3. Autonomy & AI Safety

| ID | Control | Baseline Evidence | Verified Evidence | Audited Evidence |
|----|---------|-------------------|-------------------|------------------|
| A-1 | Tier Limit | Config File | Runtime Enforcement Log | Hard-coded Circuit Breakers |
| A-2 | Human-in-the-Loop | Architecture Diagram | Test Case Execution Log | Process Observation |
| A-3 | Model Cards | Basic Metadata | Complete Model Card | External Safety Assessment |

## 4. Cost Controls

| ID | Control | Baseline Evidence | Verified Evidence | Audited Evidence |
|----|---------|-------------------|-------------------|------------------|
| C-1 | Budget Cap | Config File | Alerting Configuration | Financial Governance Audit |
| C-2 | Unit Economics | N/A | Resource Usage Metrics | Cost Attribution Report |

## 5. Provenance & Audit

| ID | Control | Baseline Evidence | Verified Evidence | Audited Evidence |
|----|---------|-------------------|-------------------|------------------|
| P-1 | Audit Logging | Enabled Flag | Sample Audit Logs | WORM Storage Verification |
| P-2 | Artifact Signing | N/A | Cosign Verification | Root Key Ceremony Video/Log |

## 6. Verification Process

Verification is performed via the `scripts/certification/verify_conformance.ts` tool.
This tool:
1.  Reads a `certification_manifest.json` from the target.
2.  Validates the presence of referenced evidence files.
3.  Performs cryptographic checks (signatures) where applicable.
4.  Generates a pass/fail report.
