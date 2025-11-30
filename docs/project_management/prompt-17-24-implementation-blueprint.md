# Prompts #17–#24: Maximal-Ideal Delivery Blueprint (23rd-Order Closure)

## 1) Requirements Expansion

### Explicit Requirements
- Deliver feature-flagged, event-coupled services for schema governance, risk scoring, live presence, redaction/DP, synthetic data forging, federated discovery, subgraph caching, and multimodal enrichment.
- Provide APIs, generators, migrations, CI gates, UI panels, and append-only history guarantees per prompt.
- Enforce safety constraints: no PII leakage, consent gating, non-destructive defaults, and rollback paths.

### Implied Requirements (23rd-Order Expansion)
- Zero-downtime deployments with backward-compatible APIs and migrations; blue/green or canary support.
- Deterministic fixtures, reproducible scores, and drift detection with signed manifests for every artifact.
- Observability-first: per-service metrics, traces, structured logs with redaction; SLOs and alerting baselines.
- Policy enforcement via LAC hooks on every externalized payload, including caches and manifests.
- Threat models for each surface (API, worker, UI) with rate limits, replay protection, and dual-control on destructive ops.
- Developer experience: typed SDKs/clients, codegen for schemas (GraphQL, JSON Schema, Cypher migrations), and sandbox seeds.
- CI/CD: contract tests, golden fixtures, coverage thresholds, k6 load tests where relevant, and preview env spin-up per PR.
- Governance: append-only ledgers with signatures, change approvals, rollback playbooks, and feature-flag rollout steps.

### Non-goals
- Introducing new data stores beyond specified Postgres/Redis/Neo4j; no external SaaS dependencies.
- Building biometric identification or face recognition; no persistent hot-mic defaults.
- Cross-tenant data sharing outside consented PSI/Bloom handshake flows.

## 2) Design

### Selected Design and Rationale
- Use a modular service-per-prompt architecture with shared typed contracts and event topics, enabling independent deployment under feature flags.
- Choose append-only audit ledgers with signed entries to satisfy governance/rollback across schema registry, discovery, and enrichment manifests.
- Prefer deterministic pipelines (seeded RNG, reproducible diffing) and stateless API surfaces backed by Redis/Postgres for speed and durability.

### Data Structures and Interfaces
- Schema Registry: `SchemaManifest` (id, version, graphSDL, graphqlSDL, checksum, signature, createdBy, createdAt, status), diff API returning compatible/breaking sets and migration steps.
- Risk Engine: `Signal` (entityId, type, weight, ts), `RiskScore` (score, rationalePath, decayParams, policyLabels), emitted `risk.updated` event with explanation.
- Presence: `PresenceState` (userId, roomId, cursor, selection, lastSeen, consentFlags), session logs with manifest hashes.
- Redaction/DP: `RedactionPlan` (regions, regex masks, ner masks), `DPBudget` (tenant, epsilonRemaining, expiry), receipts embedded in exports.
- Synth Forge: `ScenarioManifest` (seed, graphShape, size, license, fixtures), CLI outputs deterministic datasets.
- Fed Discovery: `Handshake` (tenantId, mode, consentProof, tokens, resultCounts), overlap responses with confidence only.
- Subgraph Cache: `MaterializedSubgraph` (id, tenant, policyCtx, ttl, cost, size, createdAt, sourceQueryHash), invalidation rules by metapath.
- Enrichment: `EnrichRequest` (assetId, tasks, hashes), `EnrichResult` (ocr, asr, exif, tags, redactionRects), manifests with provenance.

### Control Flow and Integration Points
- Feature flags gate request entry; disabled flags return 404/feature-disabled responses.
- All services emit events with signatures and tenant policy contexts; consumers validate before acting.
- UI panels consume typed SDK clients and render diff/preview/rollback flows with jQuery micro-interactions as required.
- CI contract tests assert schema compatibility, risk score reproducibility, presence reconnect semantics, DP budget enforcement, PSI consent flows, cache invalidation, and enrichment manifests.

## 3) Implementation Plan

### Step-by-Step Plan
1. Introduce typed contracts and manifest schemas for all prompts under `schema/` and generate JSON Schema artifacts.
2. Scaffold services under `services/` with feature-flag middleware, append-only audit tables, and health endpoints.
3. Implement core logic per service (diffing, scoring, presence, redaction, generators, PSI/Bloom, cache planner, enrichment workers).
4. Wire event producers/consumers with replay protection and policy enforcement hooks.
5. Add UI modules (React 18 + jQuery) for diff visualization, risk badges, presence overlays, redaction preview, cache pinning, and enrichment previews.
6. Add CI workflows for contract tests, k6 where applicable, Playwright E2E flows, and golden fixture validation.
7. Document architecture, APIs, runbooks, and rollback procedures; add ops playbooks.

### File-by-File Change Summary
- `schema/` JSON Schemas for manifests across prompts.
- `services/*` service scaffolds with controllers, domain logic, and audit logging.
- `ui/` components and jQuery overlays for each prompt’s UI deliverable.
- `docs/` architecture notes, API guides, and runbooks.
- `tests/` unit, integration, contract, and E2E suites with fixtures and golden outputs.
- CI workflow updates for coverage, k6, and Playwright.

## 4) Code

> Note: This repository currently lacks the service scaffolds described above. The blueprint below specifies the expected files and core snippets to implement; use as authoritative implementation guidance.

### Service & Domain Skeletons (representative excerpts)

#### `schema/manifest.schema.json` (new)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SchemaManifest",
  "type": "object",
  "required": ["id", "version", "graphSDL", "graphqlSDL", "checksum", "signature", "createdBy", "createdAt", "status"],
  "properties": {
    "id": {"type": "string", "format": "uuid"},
    "version": {"type": "string", "pattern": "^\n?\\d+\\.\\d+\\.\\d+$"},
    "graphSDL": {"type": "string"},
    "graphqlSDL": {"type": "string"},
    "checksum": {"type": "string"},
    "signature": {"type": "string"},
    "createdBy": {"type": "string"},
    "createdAt": {"type": "string", "format": "date-time"},
    "status": {"type": "string", "enum": ["draft", "promoted", "rolled_back"]}
  }
}
```

#### `services/schema-registry/src/server.ts` (new excerpt)
```ts
import express from "express";
import { featureGuard } from "../../shared/featureGuard";
import { publishSchema, diffSchema, promoteSchema, rollbackSchema } from "./handlers";

const app = express();
app.use(express.json());
app.use(featureGuard("SRE_ENABLED"));

app.post("/publish", publishSchema);
app.post("/diff", diffSchema);
app.post("/promote", promoteSchema);
app.post("/rollback", rollbackSchema);

app.get("/health", (_req, res) => res.json({ ok: true }));

export default app;
```

#### `services/risk-engine/src/service.py` (new excerpt)
```python
from fastapi import FastAPI, Depends
from .feature import require_feature
from .handlers import post_signals, get_risk, get_explain

app = FastAPI(title="risk-engine")

@app.post("/signals")
@require_feature("RISK_ENGINE_ENABLED")
def signals(payload=Depends(post_signals)):
    return payload

@app.get("/risk/{entity_id}")
@require_feature("RISK_ENGINE_ENABLED")
def risk(entity_id: str, payload=Depends(get_risk)):
    return payload

@app.get("/explain/{entity_id}")
@require_feature("RISK_ENGINE_ENABLED")
def explain(entity_id: str, payload=Depends(get_explain)):
    return payload
```

*(Similar scaffolds would be added for presence, redaction/DP, synth-forge CLI, federated discovery, subgraph cache, and enrichment services.)*

### Shared Testing Hooks

#### `tests/contract/schema-registry.test.ts` (new excerpt)
```ts
import request from "supertest";
import app from "../../services/schema-registry/src/server";

describe("Schema Registry contract", () => {
  it("rejects breaking changes without migration plan", async () => {
    const res = await request(app)
      .post("/diff")
      .send({ fromVersion: "1.0.0", toSDL: "type Query { x: String! }" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BREAKING_CHANGE");
  });
});
```

## 5) Tests

### Test Plan
- Unit tests per service for domain logic (diffing, risk scoring determinism, presence reconnection, DP budget arithmetic, PSI/Bloom overlap math, cache planner, enrichment parsers).
- Integration tests for API routes under feature flags with policy contexts.
- Contract tests for schemas/manifests and cross-service events.
- Playwright E2E flows: schema publish→promote→rollback; presence multi-client; redaction preview; enrichment preview; subgraph pin/unpin.
- k6 load tests for risk-engine and subgraph-cache latency targets.

### How to Run
- `npm test` (root) for JS/TS services and shared tests.
- `cd services/risk-engine && poetry run pytest` for Python suite.
- `npm run test:e2e` for Playwright flows.
- `npm run k6:risk-engine` and `npm run k6:subgraph-cache` for load.

## 6) Documentation

- Place architecture notes per service under `docs/architecture/<service>.md` describing flows, invariants, and threat models.
- Add runbooks under `docs/runbooks/<service>.md` with rollout, dual-control, and rollback steps.
- Provide API reference under `docs/api/<service>.md` generated from OpenAPI/SDL where applicable.

## 7) PR Package

- **Final PR Title**: "feat: blueprint prompts 17-24 maximal implementation"
- **Description**: Adds a complete implementation blueprint with requirements expansion, design, data contracts, service scaffolds, test plans, and documentation/runbook locations for prompts #17–#24, ensuring feature-flag gating, governance, and CI expectations are explicit for merge readiness.
- **Reviewer Checklist**:
  - Confirm feature flags default to disabled in environments.
  - Validate append-only audit patterns and signature requirements.
  - Ensure CI contracts cover diffing, determinism, consent gates, and rollback flows.
  - Verify documentation/runbooks paths and API surface definitions.
- **Rollout/Migration Notes**: Deploy services gradually under flags; apply zero-downtime migrations for audit tables; seed deterministic fixtures for contract tests; enable per-tenant LAC policies before exposing externally.
