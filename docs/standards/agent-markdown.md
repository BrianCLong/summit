# Agent Markdown Mapping Standard

## Status
- **Type:** Implementation standard
- **Scope:** Agent-optimized ingestion path for Markdown-first endpoints
- **Default runtime mode:** Disabled (feature-flagged)

## Summit Subsumption Position
Summit consumes AI-friendly endpoint surfaces and converts them into machine-verifiable evidence artifacts with deterministic outputs.

## Grounded External Claims (ITEM)
- Automated Markdown representations can reduce LLM parsing ambiguity.
- AI-friendly formatting benefits agent workflows.
- Markdown surfaces can reduce scraping complexity for automated systems.

## Minimal Winning Slice (MWS)
Given a URL that serves `text/markdown`, Summit must:
1. Detect agent-compatible markdown media type.
2. Normalize payload into Summit evidence schema.
3. Emit deterministic artifacts with stable IDs and stable ordering.
4. Pass evidence schema validation and determinism checks.

## Required Artifacts
Output path:

```text
artifacts/<item-slug>/
  report.json
  metrics.json
  stamp.json
```

Artifact rules:
- `report.json`: normalized evidence envelope and source metadata.
- `metrics.json`: parse latency, payload size, and parser outcomes.
- `stamp.json`: deterministic digest data and evidence IDs.

## Evidence ID Contract
Required format:

```text
EV-<item-slug>-<hash-prefix>
```

Constraints:
- Stable over equivalent input.
- Derived from canonicalized content and normalization version.
- Sorted and reproducible across reruns.

## Adapter Contract (Phase 1)

### Detection
Accept when all are true:
- HTTP status in success range.
- `Content-Type` includes `text/markdown`.
- UTF-8 payload validation succeeds.
- Payload size is below configured threshold.

Reject when any are true:
- Ambiguous or missing content type.
- Invalid encoding.
- Payload exceeds limits.

### Normalization
- Parse Markdown into canonical evidence segments.
- Strip non-essential transport wrappers.
- Preserve source URI, retrieval digest, and retrieval mode.
- Normalize whitespace and list/table structure deterministically.

### Determinism
- JSON outputs must be sorted by keys.
- No runtime timestamps in deterministic sections.
- Hash input must use canonical serialization.

## Threat-Informed Controls

| Threat | Control | Validation Gate | Test Fixture |
|---|---|---|---|
| Malicious Markdown injection | Sanitization and strict parser mode | `sanitizer-check` | Injection fixture |
| Hidden prompt injection via comments | Strip HTML comments and hidden directives | Policy regression gate | Prompt-leak fixture |
| Schema drift | Scheduled drift detector + schema pinning | Drift scheduled job | Hash mismatch fixture |
| Oversized payload DOS | Hard size cap + early abort | Runtime constraint gate | Large-file fixture |

## Performance and Cost Envelope
- Parse latency target: `< 200ms` per document (baseline hardware profile).
- Memory target: `< 50MB` peak in adapter path.
- Artifact size target: `< 2MB` per run.

Profiling output contract:

```text
artifacts/perf/metrics.json
```

## Rollout Plan
- **Phase 1:** Direct Markdown ingestion (this standard).
- **Phase 2:** Auto-discovery support (e.g. conventional agent endpoint location patterns).
- **Phase 3:** Policy scoring and drift intelligence.

## Non-Goals
- No CDN-layer feature replacement.
- No scraping framework rewrite.
- No HTML parser refactor.
- No CI architecture redesign.

## CI / Governance Expectations
The implementation PR must include:
- Determinism checks for artifact reproducibility.
- Evidence schema compliance checks.
- Security fixture coverage for injection and oversized input.
- Feature-flag default OFF behavior verification.

## Operational Readiness
Runbook requirements for enablement:
- Alert when drift persists for 3 consecutive checks.
- SLO target: 99% successful ingestion for eligible endpoints.
- Incident triage levels and rollback criteria documented in ops runbook.

## Positioning Language (Approved)
Use:
- “Summit consumes AI-friendly endpoints and guarantees machine-verifiable evidence outputs.”

Do not use:
- Claims that Summit replaces CDN distribution features.
- Performance superiority claims without benchmark evidence.
