---
title: Situation report – 6 Feb 2026 (IO + espionage + blackout + deepfakes)
summary: Standard for watchboard-grade IO/CI pipeline artifacts tied to Reuters + RSF claims.
owner: intelgraph
version: v1
lastUpdated: 2026-02-06
---

# Situation report – 6 Feb 2026 (IO + espionage + blackout + deepfakes)

## Authority & alignment
- Governing authorities: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`.
- Readiness assertion: `docs/SUMMIT_READINESS_ASSERTION.md`.
- GA guardrails: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`.

## Purpose
Define the watchboard-grade pipeline for turning OSINT articles into traceable claim graphs,
alerting artifacts, and deterministic evidence bundles for the 2026-02-06 sitrep.

## Scope
In scope (minimal winning slice):
- Ingest a fixed, offline fixture set for Reuters + RSF anchors.
- Normalize into `WatchEvent`, `Claim`, `Entity`, `Relationship`.
- Emit watchboard JSON feed, graph updates, and evidence bundles.

Out of scope (deferred pending explicit approval):
- Automated deepfake authenticity verdicts.
- Attribution beyond source wording.

## Ground-truth anchors (public)
- Reuters: Macron–Epstein smear attributed to a Russia-linked operation.
- Reuters: Greece arrests military member for espionage with suspected China links.
- RSF: Deepfakes increasing risk to journalists, especially women.

## Claim registry
| Claim ID | Summary | Source | Enforced phrasing |
| --- | --- | --- | --- |
| ITEM:CLAIM-01 | Macron–Epstein smear attributed to Russia-linked operation | Reuters | “Source reports …” |
| ITEM:CLAIM-02 | Greece arrest for military espionage; suspected China links | Reuters | “Source reports …” |
| ITEM:CLAIM-03 | Deepfakes threaten journalists; women disproportionately targeted | RSF | “Analysis reports …” |
| ITEM:CLAIM-04 | Impersonation tactics (cloned outlet) | Reuters | “Source reports …” |
| ITEM:CLAIM-05 | China-linked espionage targeting sensitive military info | Reuters | “Source reports …” |

## Data model
- `WatchEvent`: top-level sitrep event with stable ID + source bundle.
- `Claim`: normalized claim with `claim_id`, `confidence`, `source_refs`.
- `Entity`: people, places, orgs (Macron, Epstein, France, Greece, China).
- `Relationship`: edge connecting claims ↔ entities ↔ events.

All graph updates must follow the Graph Intent Architecture: use `IntentCompiler`, apply
`EvidenceBudget`, and include deterministic ordering.

## Evidence bundle requirements
Artifacts (per run):
- `report.json`
- `metrics.json`
- `stamp.json`

Determinism requirements:
- No timestamps inside JSON payloads.
- Canonical key ordering.
- Stable run IDs (`EVID-YYYYMMDD-NNNN`).

## Feature flag
- Default OFF.
- Enable in a single environment first.

## Acceptance checks
- `pnpm test` validates schema + determinism.
- Fixture run writes `artifacts/evidence/EVID-20260206-0001/{report,metrics,stamp}.json`.
- Graph output includes nodes for Macron, Epstein, France, Greece, China, plus event/claim edges.

## Security & safety policy
- Sanitization required for HTML/OSINT ingestion.
- Redaction for PII in logs per data-handling standard.
- “Source says” enforcement for attribution language.

## MAESTRO alignment
- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt/HTML injection, goal manipulation via attribution drift, evidence tampering.
- **Mitigations**: sanitization + allowlist, “source reports” enforcement, deterministic evidence hashing.

## See also
- `docs/security/data-handling/sitrep-2026-02-06-io-espionage.md`
- `docs/ops/runbooks/sitrep-2026-02-06-io-espionage.md`
- `docs/ga/TESTING-STRATEGY.md`

## Next steps
- Add fixtures and connector implementation.
- Implement watchboard schema + graph builder.
- Implement evidence bundle writer + determinism gate.
