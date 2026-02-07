# Moltbook-Class Agentic Platforms: Interop & Standards

## Scope
Deterministic evaluation of agentic platforms for secrets exposure, unauthenticated
write/tamper paths, PII leakage, and provenance signaling. This pack is strictly
fixtures-only and produces machine-verifiable artifacts with stable ordering and
no timestamps in report or metrics outputs.

## Import Matrix
| Source | Format | Notes |
| --- | --- | --- |
| Fixtures | JSON | Synthetic-only fixtures under `tests/fixtures/moltbook_ai_theater/`. |
| Optional traces (future) | HAR-like JSON | Deferred pending trace schema ratification. |

## Export Matrix
| Artifact | Path | Purpose |
| --- | --- | --- |
| Report | `artifacts/<slug>/report.json` | Findings + claim mapping + evidence IDs. |
| Metrics | `artifacts/<slug>/metrics.json` | Deterministic counters and budgets. |
| Stamp | `artifacts/<slug>/stamp.json` | Profile, fixture hash, and git SHA. |
| Evidence bundle (optional) | `artifacts/<slug>/evidence/` | Raw fixture copies or derived attestations. |

## Evidence & Claim Mapping
Findings are tagged to the Item claim registry IDs and the evidence ID pattern
`EVID:<slug>:<category>:<nnnn>`.

## Non-Goals
- Bot/human attribution or truth claims (signals-only).
- Platform-specific exploit research or zero-day reproduction.
- Handling real credentials or scraping live services.

## Governance Alignment
- Deny-by-default policies for write paths.
- Provenance evidence required when "AI-only" claims are asserted.
- Evidence artifacts must pass deterministic validation gates.

## Reference Authority
See `docs/SUMMIT_READINESS_ASSERTION.md` for readiness framing and escalation
posture.
