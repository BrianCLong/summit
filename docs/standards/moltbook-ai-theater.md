# Moltbook-Class Agentic Platforms: Interop & Standards

## Scope
Deterministic evaluation of agentic platforms for secrets exposure, unauthenticated write paths, PII leakage, and provenance signals. This pack is fixture-only and does not interact with live services.

## Governance Alignment
This standard aligns with the Summit Readiness Assertion and requires evidence-first outputs for every evaluation run.

## Import Matrix
| Source | Format | Notes |
| --- | --- | --- |
| Fixtures | `fixtures/*.json` | Synthetic fixtures only; no real secrets or PII. |
| Optional traces (future) | `*.har` | Deferred pending trace ingestion policy. |

## Export Matrix
| Artifact | Path | Constraints |
| --- | --- | --- |
| Report | `artifacts/<slug>/report.json` | Deterministic ordering; no timestamps. |
| Metrics | `artifacts/<slug>/metrics.json` | Deterministic ordering; no timestamps. |
| Stamp | `artifacts/<slug>/stamp.json` | Only stable fields: profile, fixture hash, git commit. |
| Evidence | `artifacts/<slug>/evidence/` | Machine-verifiable, deterministic filenames. |

## Evidence ID Pattern
`EVID:<slug>:<category>:<nnnn>` (example: `EVID:moltbook-ai-theater:secrets:0001`).

## Policy Gates
* **Deny-by-default** for unauthenticated write paths.
* **Secrets-in-client** detection gate.
* **PII exposure** detection gate.
* **Provenance signals** required when “AI-only” claims are asserted.

## Feature Flag
`SUMMIT_AGENTIC_PLATFORM_EVAL=0` (default OFF). Fixtures-only evaluation runs may enable the flag in CI.

## Non-Goals
* Human-vs-agent attribution certainty.
* Platform-specific exploit development or live target testing.
* Handling real credentials or production data.
