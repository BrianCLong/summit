# Structured Event Taxonomy & Schema Registry

## Naming convention

- Events use reverse-DNS style names to stay globally unique and easy to filter.
- Prefix all platform events with `summit.` followed by the domain and action, e.g.:
  - `summit.maestro.run.created`
  - `summit.maestro.run.started`
  - `summit.maestro.run.completed`
  - `summit.maestro.run.failed`
  - `summit.intelgraph.query.executed`
  - `summit.incident.detected`
  - `summit.ai.eval.run`
- Use verbs that reflect the **state change** not the HTTP method ("started", "completed", "failed", "executed").

## Common envelope

Every structured event shares a minimal envelope so downstream tools can correlate runs and actors:

| Field           | Required | Description                                                 |
| --------------- | -------- | ----------------------------------------------------------- |
| `name`          | ✅       | Fully-qualified event name.                                 |
| `version`       | ✅       | Schema version for this event (semantic: `major.minor`).    |
| `timestamp`     | ✅       | ISO-8601 time when the event was produced.                  |
| `correlationId` | ➖       | Cross-service correlation ID (trace/span/workflow).         |
| `traceId`       | ➖       | Lower-level tracing/span identifier if available.           |
| `runId`         | ➖       | Run identifier for Maestro/AI evaluation executions.        |
| `actor`         | ➖       | `{ id, type, source }` describing the user/system actor.    |
| `context`       | ➖       | `{ service, environment, region }` style execution context. |
| `payload`       | ✅       | Event-specific body defined in the schema registry.         |

> **No secrets:** Payloads must not include secrets, tokens, raw prompts, or PII-rich blobs. Summaries and identifiers only.

## Versioning

- Every event has its own `version` in the registry (starting at `1.0`).
- Backwards-incompatible changes bump the **major**; additive changes bump the **minor**.
- The emitter validates against the registered version; a missing or stale schema causes a hard failure at emit time.

## Schema registry

The TypeScript registry lives in `@ga-graphai/common-types/src/events.ts`. It is the single source of truth for:

- Event names and descriptions
- Required payload fields
- Example payload shapes (used in tests/validation)

Current event set (Phase 1):

| Event                              | Version | Required payload fields                                                                        | Notes                                                              |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `summit.maestro.run.created`       | 1.0     | `runId`, `pipelineId`, `stageIds`                                                              | Emitted when an execution run is initialized.                      |
| `summit.maestro.run.started`       | 1.0     | `runId`, `pipelineId`, `stageCount`, `planScore`                                               | Logged after a plan is generated and execution begins.             |
| `summit.maestro.run.completed`     | 1.0     | `runId`, `pipelineId`, `status`, `traceLength`, `successCount`, `recoveredCount`, `durationMs` | Success/degraded terminal state.                                   |
| `summit.maestro.run.failed`        | 1.0     | `runId`, `pipelineId`, `reason`                                                                | Terminal failure with reason and optional stage detail.            |
| `summit.intelgraph.query.executed` | 1.0     | `queryType`, `subjectId`, `durationMs`, `resultCount`                                          | Structured query telemetry for IntelGraph queries.                 |
| `summit.incident.detected`         | 1.0     | `incidentId`, `assetId`, `severity`, `metric`, `timestamp`                                     | Generated when Maestro detects/records an incident.                |
| `summit.ai.eval.run`               | 1.0     | `evalId`, `targetModel`, `dataset`, `status`                                                   | Placeholder for AI evaluation runs, mirroring run lifecycle shape. |

## Adding a new event

1. Define the payload shape in `events.ts` (`EventPayloads` map) and add a schema entry with required fields.
2. Update or add tests in `ga-graphai/packages/common-types/tests/events.test.ts` to cover validation.
3. Emit via `StructuredEventEmitter.emitEvent(name, payload, metadata)` from the relevant service.
4. Keep payloads minimal and redact secrets before emitting.

## Emission pattern (JSONL)

Emit structured logs as discrete JSON lines so log processors can ingest them directly:

```ts
const events = new StructuredEventEmitter();
const envelope = events.emitEvent(
  "summit.maestro.run.started",
  {
    runId: "pipeline-123:1713811200",
    pipelineId: "pipeline-123",
    stageCount: 4,
    planScore: 0.78,
  },
  {
    correlationId: "trace-abc",
    context: { service: "meta-orchestrator", environment: "staging" },
  }
);
// envelope is returned for in-memory use; the emitter also logs JSON by default.
```

This registry + emitter is the canonical pattern for future domain events across Maestro, IntelGraph, and evaluation tooling.
