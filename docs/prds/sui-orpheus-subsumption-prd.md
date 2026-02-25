# PRD: Summit Underwriting Intelligence (SUI) — Orpheus Subsumption

## Product thesis

Build an insurer-grade underwriting intelligence system that combines deterministic risk scoring,
portfolio drift management, and remediation orchestration with replayable evidence.

## Market and competitor frame

### Primary competitor cluster

- Orpheus (threat-led insurer workflow positioning)
- Cyberwrite, KYND, ISS-Corporate (insurer-scoring ecosystem)
- Security ratings/modeling adjacencies: BitSight, SecurityScorecard, CyberCube, Kovrr, Verisk

### Summit positioning

Summit is the evidence-first alternative: not only risk scores, but deterministic and auditable
underwriting decisions integrated with portfolio operations.

## MVP scope

1. `/score`, `/explain`, `/portfolio/drift` APIs.
2. Leaked-signal + attack-surface + CVE feature extraction.
3. TIDE-like scoring baseline with quintile lift output.
4. Underwriting packet generation and remediation queue export.
5. Evidence bundle output and CI validation.

## Pricing hypotheses (assumptions)

- **Assumption H1:** Base annual platform fee by monitored entity volume tier.
- **Assumption H2:** Optional premium for analyst-assisted remediation workflows.
- **Assumption H3:** API/connector overage pricing for high-ingest customers.

Validation: run pilot pricing experiments across 2-3 broker/insurer personas.

## Pilot plan

### Pilot 1: insurer portfolio validation

- Inputs: historical claims-linked portfolio snapshots (insurer-hosted)
- Success: meaningful quintile separation and acceptable calibration
- Output: reproducible evaluation packet and governance evidence

### Pilot 2: broker workflow acceleration

- Inputs: quote intake and prospect domains
- Success: time-to-underwriting-packet reduced by >=30%
- Output: workflow telemetry and analyst feedback

### Pilot 3: post-bind monitoring and remediation

- Inputs: bound policy portfolio across a renewal cycle
- Success: drift detection precision and remediation completion throughput gains
- Output: actionable renewal intelligence packet

## Launch checklist

- Architecture docs approved (`docs/sui/*.md`).
- Security gates passing (tenant isolation + PII minimization + audit integrity).
- Evals passing (AUC/calibration/lift + UDR-AC threshold).
- Ops runbooks validated in dry-run simulation.
- SBOM/provenance artifacts generated and signed.
- GTM battlecard and enablement narrative approved.

## Success criteria

- UDR-AC >= 0.99 in CI reference suite.
- Stable deterministic artifacts across reruns.
- Pilot underwriting packet cycle-time improvement >=30%.
- Demonstrated quintile lift separation on pilot claims data.
- No critical governance gate bypasses in release window.
