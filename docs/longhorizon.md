# LongHorizon Orchestration (MVP)

## Readiness Alignment

LongHorizon evidence and policy gating are aligned to the Summit Readiness Assertion and governance authority files (see `docs/SUMMIT_READINESS_ASSERTION.md`). Governed Exceptions include the delito (23rd order of imputed intention) classification for long-horizon audits.

## Architecture Overview

LongHorizon is an evolutionary orchestration layer that coordinates multi-step, long-horizon work with deterministic evidence, policy gates, and audit-ready memory. The MVP delivers:

- **Maestro Orchestration**: Task DAGs, checkpoint/resume, role-based steps, and tool routing.
- **Switchboard Tool Contract**: All actions flow through a unified tool router with permission tiers and deterministic logging.
- **IntelGraph Memory Layers**: Working, episodic, and semantic memory nodes stored as content-addressed entries.
- **Quality-Diversity Search**: MAP-Elites archive plus island model migration to preserve diverse solutions.
- **AlphaEvolve Loop**: Candidate evaluation, scoring, archive promotion, and evidence bundles.

## Key Modules

- `src/longhorizon/run.ts`: Run lifecycle, checkpointing, budgets, and evidence output.
- `src/longhorizon/map-elites.ts`: Archive storage and promotion logic.
- `src/longhorizon/islands.ts`: Island queues and migration.
- `src/longhorizon/memory.ts`: Memory store with redaction.
- `src/longhorizon/switchboard.ts`: Tool contracts and audit logging.

## How To Run

```bash
pnpm tsx src/cli/maestro-longhorizon.ts \
  --config examples/longhorizon/sample-task.json \
  --artifacts-dir artifacts/longhorizon
```

Artifacts are written under `artifacts/longhorizon/<run-id>/` with both JSON and Markdown run reports. Checkpoints are written under `artifacts/longhorizon-checkpoints/`.

## Safety Model

- **Permission Tiers**: Tools are registered with read/write/execute tiers to gate capabilities.
- **Policy Gates**: Candidates are rejected if patches touch disallowed paths.
- **Redaction**: Memory payloads are redacted for tokens and secrets before storage.
- **Tenant Scoping**: Run IDs and memory nodes are tenant-scoped.
- **Evidence First**: Every run emits structured evidence bundles for auditability.

## Evidence Bundle Contents

- Run configuration, steps, and budgets.
- Candidate patches and metadata.
- Evaluation results, scores, and deterministic replay hashes.
- Tool call logs (Switchboard contract).

## Next Steps

- Wire deterministic command execution to real switchboard adapters.
- Extend IntelGraph persistence beyond in-memory nodes.
- Add targeted test selection for changed files.
