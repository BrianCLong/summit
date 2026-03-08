# Subsumption Plan: Framework Governance Risk (Next.js)

## 1.0 Executive Subsumption Thesis
We do NOT subsume Next.js itself.
We subsume the governance and ecosystem volatility signal into Summit as a measurable supply-chain risk dimension.

Minimal Winning Slice (MWS):
Add a deterministic framework_governance_risk signal for detected Next.js usage that outputs machine-verifiable evidence and gates CI when strategic dependency risk exceeds a threshold.

Hard scope: Next.js only.
No refactors. Feature-flag default OFF.

## 1.1 Ground Truth Capture
(From newsletter themes; no proprietary text reproduced.)
- ITEM:CLAIM-01 – Ecosystem governance tension has increased around Next.js.
- ITEM:CLAIM-02 – Infra alignment (hosting + framework) increases dependency concentration.
- ITEM:CLAIM-03 – Ecosystem dominance centralizes influence.
- ITEM:CLAIM-04 – Governance shifts affect developer trust.
- ITEM:CLAIM-05 – Strategic risk assessment is relevant for companies building on it.

## 1.2 Claim Registry
| Summit Artifact | Backed By |
| --- | --- |
| Governance Opacity Signal | ITEM:CLAIM-01 |
| Infra Coupling Heuristic | ITEM:CLAIM-02 |
| Ecosystem Concentration Index | ITEM:CLAIM-03 |
| Trust Volatility Flag | ITEM:CLAIM-04 |
| Strategic Dependency Warning | ITEM:CLAIM-05 |
| CI Enforcement Gate | Summit original |

## 1.3 PR Stack
1. **feat(framework-risk): add subsumption plan and repo assumptions**
2. **feat(framework-risk): detect nextjs usage** (go package `internal/frameworkrisk`, evidence IDs)
3. **feat(framework-risk): add deterministic scoring engine** (scoring, metrics.json output)
4. **ci: add framework-governance-risk gate** (GitHub Actions workflow, threshold config)
5. **docs: governance risk standard + data handling** (`docs/standards/nextjs.md`, etc.)

## 1.4 Architecture Addition
New Module:
`/internal/frameworkrisk/`
  `detect_nextjs.go`
  `governance_signal.go`
  `scoring.go`
  `evidence.go`

No external API calls. No telemetry.

## 1.5 Deterministic Outputs
Artifacts (must match Summit conventions):
`report.json`
`metrics.json`
`stamp.json`
