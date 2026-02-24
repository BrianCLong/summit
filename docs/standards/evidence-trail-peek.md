# Evidence-Trail Peek Standard

## Summit Readiness Assertion

This change is aligned with the Summit Readiness Assertion and implements evidence-first UX for auditable answers. Deferred pending no additional readiness gates.

## Purpose

Evidence-Trail Peek provides a lightweight overlay that surfaces provenance timeline events, top-N evidence artifacts, and a minimized set of the three most-verifiable claims with deterministic evidence badges. The overlay is read-only and uses existing `evidence_id` relationships.

## Scope

- **UI overlay** attached to answer surfaces and graph nodes.
- **Read-only REST endpoints**:
  - `GET /api/evidence-index`
  - `GET /api/evidence-top`
  - `GET /api/claim-ranking`
- **Feature flag**: `features.evidenceTrailPeek` (default OFF).
- **Telemetry**: runtime-only metrics; no new persistent data.

## Data Contracts

### Evidence Index (`GET /api/evidence-index`)

Query parameters: `answer_id` or `node_id`.

Response:

```json
{
  "timeline": [
    {
      "id": "claim-123",
      "type": "claim",
      "timestamp": "2026-02-07T10:00:00Z",
      "label": "Claim text",
      "detail": "factual"
    }
  ],
  "claimCount": 1,
  "evidenceCount": 1
}
```

### Evidence Top (`GET /api/evidence-top`)

Query parameters: `answer_id` or `node_id`, optional `limit`.

Response:

```json
{
  "artifacts": [
    {
      "id": "evidence-1",
      "artifactType": "sbom",
      "location": "s3://...",
      "createdAt": "2026-02-07T11:00:00Z",
      "preview": "preview text"
    }
  ]
}
```

### Claim Ranking (`GET /api/claim-ranking`)

Query parameters: `answer_id` or `node_id`.

Response:

```json
{
  "claims": [
    {
      "id": "claim-1",
      "content": "Claim text",
      "confidence": 0.9,
      "claimType": "factual",
      "extractedAt": "2026-02-07T10:00:00Z",
      "verifiabilityScore": 1.0,
      "badges": [
        { "kind": "SBOM", "href": "/api/provenance-beta/evidence/evidence-1" }
      ],
      "supporting": []
    }
  ]
}
```

Deterministic badges are limited to `SBOM`, `Provenance`, `Test`, and `Attestation`. Claims without at least one deterministic badge are excluded.
Badge links reuse existing provenance evidence endpoints (`/api/provenance-beta/evidence/:id`).

## Feature Flag

`features.evidenceTrailPeek` is enabled via runtime feature flags or `VITE_FEATURE_EVIDENCE_TRAIL_PEEK=true`. Default OFF.

## Import/Export Matrix

**Imports**

- `answer_id`, optional `node_id`
- `evidence_id` relationships via `claim_evidence_links`
- Evidence metadata from `evidence_artifacts`

**Exports**

- Overlay UI with provenance timeline, top artifacts, and minimized claims
- Telemetry events (runtime only; no raw evidence bodies)

## Telemetry (Runtime Only)

- `time_to_first_confident_verdict_ms`
- `verification_error_rate` (derived from failed fetch attempts)
- `answer_surface_claim_count`
- `badge_click_through`
- `artifact_click_through`

Payloads do **not** include raw evidence bodies or URL query strings.

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Observability, Security
- **Threats Considered**:
  - Evidence spoofing via arbitrary URLs
  - UI injection via untrusted titles
  - Data leakage through telemetry payloads
- **Mitigations**:
  - Server-side scoping by tenant and read-only enforcement
  - Client rendering without `dangerouslySetInnerHTML`
  - Telemetry strips query strings and excludes evidence bodies

## Non-Goals

- No changes to provenance storage or evidence generation.
- No new data model or persistent timestamps.
- No UI redesign outside the overlay.
