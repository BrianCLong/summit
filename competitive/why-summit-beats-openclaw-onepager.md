# Summit vs OpenClaw — One-Page Advantage Sheet

**Positioning:** Summit is the governed, enterprise-grade intelligence platform that proves security, provenance, and compliance by design. OpenClaw is a productivity gateway with a higher supply-chain risk surface and weaker governance controls.

## Executive Differentiators

1. **Governed Security & Provenance by Default**
   - Policy-as-code gates (OPA/Rego) are enforced in CI/CD and agent runtime with pinned policy bundle SHAs. Audit trails are cryptographically chained for tamper-evident reconstruction of actions and policy context.
   - Governance-drift detection prevents silent divergence from required checks, keeping enforcement consistent across releases.

2. **Enterprise Multi-Repo Architecture**
   - Summit is built as a four-repo, enterprise stack: IntelGraph (graph intelligence), Maestro (autonomic control plane), Switchboard (ingestion and routing fabric), and CompanyOS (knowledge/runbook layer).
   - Cross-repo dependencies, schema migration discipline, and integration testing are platform behaviors, not ad hoc user practices.

3. **Compliance Evidence Automation**
   - Compliance evidence is produced as a first-class feature, generating structured artifacts that map to SOC2/ISO controls and audit readiness.
   - Audit logging and compliance reporting are on the product roadmap with quarterly security review and penetration testing cadence.

4. **OSINT & Threat Intelligence Native Design**
   - Summit is built for intelligence workflows: multi-agent analyst swarms, STIX/JSON/MISP export, SIEM/SOAR APIs, and deep OSINT feed integration.
   - Graph-native analysis plus AI copilot workflows deliver narrative simulation and cross-domain intelligence fusion.

5. **Extension Supply-Chain Hardening**
   - Every extension is treated as untrusted code with integrity checks and CI-integrated policy controls before shipping.
   - Ingestion and routing are governed at the edge (Switchboard) and at the agent layer, not just by post-hoc scanning.

## Side-by-Side Summary

| Dimension | OpenClaw | Summit Stack (Summit + Switchboard + IntelGraph + Maestro + CompanyOS) |
| --- | --- | --- |
| Security model | Gateway + skills with broad privileges; higher exposure to skill supply-chain risks. | OPA/Rego-governed behaviors, pinned policy bundles, tamper-evident audit chains, and drift detection. |
| Provenance | Limited lifecycle provenance; relies on skill scanning. | Cryptographic audit chains and policy-bound provenance across CI/CD and runtime. |
| Architecture | Single gateway with plugins/skills. | Multi-repo enterprise stack with governed ingestion, orchestration, and intelligence graph. |
| Multi-tenancy & RBAC | Persona isolation without full enterprise tenant model. | Enterprise tenant isolation and RBAC designed as first-class platform features. |
| Compliance & audit | Operator responsibility; limited native evidence automation. | Compliance evidence automation + audit logging/reporting integrated into release lifecycle. |
| Domain specialization | Personal productivity automation. | OSINT, threat intelligence, and espionage-defense workflows with graph-native analytics. |
| Extension risk posture | Skills treated as trusted code; marketplace incentives create risk. | Extensions treated as untrusted; integrity checks and policy-aware releases. |

## Readiness Assertion

Summit’s operating posture is anchored in the **Summit Readiness Assertion**, which documents the mandatory readiness guarantees and enforcement posture for every release: `docs/SUMMIT_READINESS_ASSERTION.md`.

## Forward-Looking Enhancement

**Governed Evidence Ledger Export:** add an automated evidence export pack that emits machine-verifiable audit bundles (policy bundle SHAs, hash-chain anchors, and runtime event proofs) for customer GRC ingestion on every release.

## Recommended Use

- **Enterprise security and compliance teams** that require audit-ready evidence and provable governance.
- **Intelligence and OSINT operators** that need graph-native fusion, multi-agent analysis, and controlled ingestion pipelines.
- **Platform engineering leaders** who demand release gating, provenance guarantees, and policy-bound runtime behavior.
