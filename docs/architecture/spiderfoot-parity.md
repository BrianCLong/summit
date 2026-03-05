# Architecture: SpiderFoot Parity Kernel & Proof Moat

## 1. Directory Structure

```text
summit-intel/
├── core/
│   ├── evidence/
│   │   ├── ids.ts          # Deterministic ID generation (BUNDLE_ID, EVIDENCE_ID, FINDING_ID)
│   │   ├── canonicalize.ts # JSON canonicalization for hashing
│   │   └── bundle.ts       # Evidence Bundle V1 assembly and signing
│   ├── pipeline/
│   │   ├── dag.ts          # Pipeline execution DAG
│   │   ├── scheduler.ts    # Job scheduling
│   │   └── monitors.ts     # Diff-based monitoring
│   ├── graph/
│   │   ├── entities.ts     # Entity schemas (IP, Domain, Email, etc)
│   │   ├── edges.ts        # Graph edges with provenance pointers
│   │   └── resolver.ts     # Entity resolution and canonical ordering
│   └── correlation/
│       ├── dsl.ts          # YAML correlation rule parser
│       ├── engine.ts       # Rule execution engine
│       └── rules/          # 37+ pre-defined rules (SpiderFoot parity)
├── sdk/
│   └── module/
│       ├── interface.ts    # Module inputs/outputs schema
│       ├── context.ts      # Execution context
│       ├── secrets.ts      # Secret injection
│       └── netpolicy.ts    # Network egress policy
├── runtime/
│   └── runner/
│       ├── executor.ts     # Module executor
│       └── sandbox.ts      # Isolation boundary
├── connectors/
│   └── spiderfoot/
│       ├── adapter.ts      # Wrapper to execute external SpiderFoot
│       └── mapper.ts       # Maps SpiderFoot outputs to Summit Evidence Bundles
├── integrations/
│   ├── webhook/
│   ├── splunk_hec/
│   ├── jira/
│   └── servicenow/
├── ui/
│   ├── cases/              # Case-first workspace UX
│   ├── evidence/           # Evidence viewer & citation UX
│   └── diffs/              # Diffs & monitoring timeline
└── cli/
    └── commands/
        ├── run.ts          # Execute pipeline
        └── verify.ts       # Verify evidence bundle signatures and hashes
```

## 2. SpiderFoot Adapter Design

**Goal:** Leverage SpiderFoot's 200+ modules for fast coverage without inheriting its architecture.

*   **Execution:** The adapter (`connectors/spiderfoot/adapter.ts`) wraps the SpiderFoot CLI/Docker image. It passes targets and module configurations.
*   **Ingestion:** The mapper (`connectors/spiderfoot/mapper.ts`) parses SpiderFoot's JSON/CSV exports.
*   **Decoupling:** Crucially, SpiderFoot is treated *strictly* as an untrusted collector. Its outputs are immediately routed through Summit's `core/evidence/ids.ts` to assign deterministic `EVIDENCE_ID`s and wrap them in a Summit Evidence Bundle.
*   **Storage:** The mapped entities are upserted into the Graph Store, with provenance pointers linking back to the generated `EVIDENCE_ID`.

## 3. PR Rollout Plan

*   **PR-01: Evidence Bundle v1 + Determinism Harness**
    *   Files: `core/evidence/{ids.ts, canonicalize.ts, bundle.ts}`, `cli/commands/{run.ts, verify.ts}`, `schemas/evidence_bundle_v1.json`
    *   Interfaces: `EvidenceBundle`, `Stamp`, `Metrics`
    *   Test Strategy: Golden tests (`tests/golden/bundle_v1/`) and rerun hash checks via `ci/determinism.yml`.
*   **PR-02: Module SDK + Runner + SpiderFoot Adapter**
    *   Files: `sdk/module/{interface.ts, context.ts, secrets.ts, netpolicy.ts}`, `runtime/runner/{executor.ts, sandbox.ts}`, `connectors/spiderfoot/{adapter.ts, mapper.ts}`
    *   Interfaces: `ModuleInput`, `ModuleOutput`, `RunnerContext`
    *   Test Strategy: Module conformance tests, rate-limit determinism, and output schema golden tests.
*   **PR-03: Pipeline Engine + Scheduler + Continuous Monitoring**
    *   Files: `core/pipeline/{dag.ts, scheduler.ts, monitors.ts}`, `api/routes/pipelines.ts`
    *   Interfaces: `PipelineSpec`, `Schedule`, `DiffSummary`
    *   Test Strategy: Monitor diff determinism (same old/new bundles → same diff) and schedule semantics tests.
*   **PR-04: Graph Model + Entity Resolution**
    *   Files: `core/graph/{entities.ts, edges.ts, resolver.ts}`, `storage/graph/{driver.ts, migrations/*}`
    *   Interfaces: `GraphEntity`, `ProvenanceEdge`
    *   Test Strategy: Resolver stability checks (canonical ordering) and graph query golden tests.
*   **PR-05: Correlation Rules DSL**
    *   Files: `core/correlation/{dsl.ts, engine.ts, rules/*.yaml}`
    *   Interfaces: `RuleDefinition`, `RuleMatch`
    *   Test Strategy: Rule determinism, rule linting, and snapshot tests for matches.
*   **PR-06: Case-first UX**
    *   Files: `ui/cases/*`, `ui/evidence/*`, `ui/diffs/*`
    *   Interfaces: UI components, `CaseView`
    *   Test Strategy: UI e2e smoke tests and export determinism checks.
*   **PR-07: Integrations Center v1**
    *   Files: `integrations/{webhook, splunk_hec, jira, servicenow}/*`, `core/playbooks/{playbook.ts, triggers.ts}`, `api/routes/integrations.ts`
    *   Interfaces: `IntegrationProvider`, `ActionPayload`
    *   Test Strategy: Contract tests with mock endpoints, retry determinism, and payload golden tests.
*   **PR-08: Vuln Prioritization Module v1**
    *   Files: `modules/vuln/{ingest.ts, features.ts, score.ts, explain.ts}`, `datasets/fixtures/vuln/*`
    *   Interfaces: `VulnFeatureVector`, `VulnScoreExplanation`
    *   Test Strategy: Scoring determinism, explanation completeness, and model feature schema golden tests.
*   **PR-09: Brand/Impersonation Module v1**
    *   Files: `modules/brand/{typosquat.ts, dns_cert.ts, screenshot.ts, logo.ts, score.ts, takedown_packet.ts}`
    *   Interfaces: `BrandArtifact`, `TakedownPacket`
    *   Test Strategy: Artifact completeness checks, screenshot hashing stability on fixtures.
