# Summit GA Golden Path Workflow

## Workflow lifecycle

The `summit-golden-path` workflow executes on pull requests and follows an evidence-first lifecycle:

1. Checkout and toolchain setup.
2. Governance policy gate execution (`governance/policy-check.ts`).
3. Golden-path test scaffold execution.
4. Evidence bundle generation (`evidence/out/bundle.json`).
5. Schema validation against `evidence/schema.json`.
6. Observer notification stub invocation (`services/observer/notify.ts`).
7. Artifact upload for governance and release review.

A failing policy result exits non-zero and blocks PR progression.

## Agent responsibilities

- **Jules (Release Captain):** Defines release gates and merge expectations.
- **Codex (Engineer):** Implements workflow logic, policy checks, and evidence generation.
- **Observer:** Consumes completion events and closes verification feedback loops.

## Evidence and compliance support

The bundle captures build identity, commit lineage, policy outcomes, test outcomes, and provenance. This
creates a deterministic audit surface that can be retained for governance inspections, GA readiness
verification, and post-incident forensic review.

## Observer loop closure

`notifyObserver` currently runs as a deterministic stub with explicit TODO hooks for Slack, IntelGraph,
and immutable audit log writes. This keeps the workflow executable now while preserving a clean upgrade
path to full operational telemetry.
