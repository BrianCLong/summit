# Summit MVP-3 GA Master Orchestration Plan

This document defines the end-to-end coordination plan for taking Summit MVP-3 from pre-GA to full GA. It aligns the specialist sub-agents, enforces governance-first delivery, and enumerates evidence and communication deliverables.

## Mission & Success Criteria

- Enforce governance verdict objects on every execution path with zero bypasses and CI regression coverage.
- Require provenance/confidence/simulation flags for all APIs and UI rendering; block unprovenanced payloads.
- Provide versioned APIs with schema snapshots and CI schema diff gates; mandate explicit version bumps for breaking changes.
- Make CI the law: lint/typecheck/build/test/governance/provenance/schema/security gates plus merge-safe artefact.
- Deliver unified logging/tracing with correlation IDs and operator dashboards that answer what/where/why without developer help.
- Produce SOC 2-aligned threat models, mitigations, governance docs, schema snapshots, verdict samples, and release-captain checklist under `audit/ga-evidence/`.
- Ship a public-ready GA announcement that highlights governance, data honesty, API stability, CI rigour, and SOC 2 alignment.

## Orchestration Principles (Beyond the 7th Order)

- **Governance-first causality**: Every workflow (ingestion, query, export, UI render) must demonstrate _causal_ dependence on a signed governance verdict and provenance metadata; absence of either halts execution.
- **Evidence as code**: All artefacts (verdict samples, schema diffs, threat models, dashboards) are treated as immutable evidence objects under `audit/ga-evidence/` with checksums and reviewer attestations.
- **Contract monotonicity**: API version increments are monotonic; breaking changes require explicit namespace bumps, schema snapshot regeneration, and consumer sign-off before merge.
- **Operator autonomy**: Dashboards, runbooks, and correlation-ID tracing must enable non-developers to diagnose and triage incidents end-to-end without code access.
- **Deterministic CI parity**: Local and CI runs must produce identical gate outcomes; drift is a P0 defect triggering immediate stop-ship.

## Sub-Agent Responsibilities, Issues, and Branches

Each sub-agent opens a GitHub issue with labels `ga` and the epic ID (GA-E1 to GA-E6) and works on a dedicated branch named `feat/<area>/<short-desc>`.

| Agent               | Epic  | Primary Scope                                                                                                   | Required Deliverables                                                                                                                       |
| ------------------- | ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| DevAgent-Governance | GA-E1 | Mandatory verdict types, wiring into all execution paths, bypass regression tests                               | Verdict schema, enforcement middleware/hooks, negative tests proving bypass prevention, evidence samples in `audit/ga-evidence/governance/` |
| DevAgent-Data       | GA-E2 | Provenance/confidence/simulation flags in APIs, UI refusal of unprovenanced data, provenance-preserving exports | API response contracts, UI guardrails, export snapshot tests, evidence in `audit/ga-evidence/provenance/`                                   |
| DevAgent-API        | GA-E3 | Versioned API namespaces, schema snapshots, schema diff CI gate                                                 | Versioned routers, schema snapshot storage in `schema-fingerprints/`, CI diff script, docs on version bump rules                            |
| DevAgent-CI         | GA-E4 | Hard gates for lint/typecheck/build/test/governance/provenance/schema/security; merge-safe artefact             | `.github/workflows/ci-ga-gates.yml` updates, artefact spec, local-vs-CI parity checks                                                       |
| SecAgent            | GA-E5 | Threat models per subsystem, mapped mitigations, SOC 2 control mapping                                          | Threat model docs, control matrix, evidence bundle entries                                                                                  |
| OpsAgent            | GA-E5 | Unified logging/tracing with correlation IDs, operator dashboards, incident diagnosis playbooks                 | Logging/tracing config, dashboard definitions, runbooks and validation screenshots                                                          |
| DocAgent            | GA-E6 | GA-grade architecture/gov docs, auditor evidence bundle, release-captain checklist                              | Architecture/gov whitepaper, evidence index updates, GA declaration checklist                                                               |
| CommsAgent          | GA-E6 | Public GA announcement aligned with legal/marketing                                                             | Announcement draft, fact-check log, approvals                                                                                               |

## Dependency & Coordination Rules

- CI gates (DevAgent-CI) depend on schema diff tooling (DevAgent-API) and governance/provenance enforcement (DevAgent-Governance/Data).
- UI provenance guards cannot merge until API responses expose provenance/confidence/simulation flags.
- Ops dashboards consume correlation IDs emitted by governance-aware services; logging format must be finalized before dashboard builds.
- Threat models from SecAgent must be referenced in governance docs and evidence bundles before GA sign-off.
- All agents must reconcile changes with `docs/roadmap/STATUS.json` before merge; deviations require Release Captain sign-off and decision-log entry.
- Cross-cutting changes that affect shared utilities (`packages/`) require explicit boundary approval and blast-radius analysis attached to the PR.

## Workflow Checklist

1. **Issue Intake**: Create issues with labels `ga` + epic ID; include acceptance criteria and evidence artefacts.
2. **Branching**: Use `feat/<area>/<short-desc>`; keep changes scoped to one zone per AGENTS guidelines.
3. **Implementation**: Add code, tests, and evidence artefacts under `audit/ga-evidence/<epic>/`.
4. **Validation**: Run targeted package tests (e.g., `npm test`, `pytest`) plus the repo CI gate; attach logs to evidence bundle.
5. **Review**: Link issues in PRs; require human approval per CODEOWNERS; include screenshots for UI dashboards.
6. **Merge-Safe Artefact**: CI must emit `ga-merge-safe` when all gates are green; Release Captain verifies before merge.
7. **Sign-Off**: Release Captain completes GA declaration checklist after all issues close and artefacts are present.
8. **Post-merge guardrails**: Re-run schema diffs, governance/provenance bypass suites, and dashboard availability checks on `main` within 24 hours of merge; publish outcomes to `audit/ga-evidence/ci/post-merge/`.
9. **Regression prevention**: Any escape (governance bypass, provenance drop, schema drift) triggers a new regression test plus evidence of failure-to-success transition attached to the offending issue.

## Evidence Bundling Map

- `audit/ga-evidence/governance/`: Verdict schemas, enforcement proofs, bypass regression outputs.
- `audit/ga-evidence/provenance/`: API/UI provenance proof, export snapshots, simulation flag coverage.
- `audit/ga-evidence/schema/`: Versioned schema snapshots, diff reports, breaking-change acknowledgements.
- `audit/ga-evidence/ci/`: CI gate logs, merge-safe artefact, local-vs-CI parity proofs.
- `audit/ga-evidence/security/`: Threat models, mitigations, SOC 2 mapping, pen-test summaries.
- `audit/ga-evidence/ops/`: Logging/tracing configs, dashboard captures, incident drill results.
- `audit/ga-evidence/comms/`: GA announcement draft, approval trail, non-capability statements.

## Milestones, Handoffs, and Decision Logs

- **Milestones**
  - _M1 – Foundations locked (Day 3)_: Governance verdict schema merged; provenance flags plumbed through APIs; initial schema snapshots captured.
  - _M2 – CI law enforced (Day 7)_: GA CI workflow guarding lint/typecheck/build/test/governance/provenance/schema/security gates is green; merge-safe artefact produced in CI; bypass regression suite runs clean.
  - _M3 – Operations hardened (Day 10)_: Unified logging/tracing with correlation IDs emitting to dashboards; incident drill produces operator-only diagnosis without developer intervention.
  - _M4 – Evidence complete (Day 12)_: Threat models, control mappings, schema diffs, verdict samples, dashboard captures, and approval trails published under `audit/ga-evidence/` with checksum/immutability notes.
  - _M5 – Release readiness (Day 14)_: GA declaration checklist executed, public announcement approved, and post-merge validation rerun on `main`.
  - _M6 – Drift resilience (Day 18)_: Schema diff gates exercised against synthetic breaking changes; chaos scenarios verify governance/provenance enforcement under partial failures; operator dashboards validated against injected latency/packet loss.

- **Handoff Protocols**
  - Governance + Data agents provide signed contract manifests (verdict/provenance schemas) to API and CI agents before schema diff rules finalize.
  - OpsAgent consumes correlation-ID format and log taxonomy defined by Governance before instrumenting dashboards.
  - SecAgent publishes threat model IDs that DocAgent references in evidence bundles and governance whitepaper; CI agents consume these IDs to link security gates.
  - CommsAgent references the signed evidence bundle index to ensure all public claims map to auditable artefacts.

- **Decision Log Requirements**
  - All cross-epic decisions recorded in `audit/ga-evidence/decisions/DECISIONS.md` with timestamp, owners, rationale, and affected epics.
  - Decisions altering API shape, provenance/verdict semantics, or logging taxonomy must include before/after examples and rollback notes.
  - Disputed decisions escalate to the Release Captain, who records the resolution and links to updated artefacts.
  - Each decision entry must link to the CI run or evidence artefact that validated the change; absent evidence blocks merge.
  - When reversing a decision, include remediation steps, restored baselines, and new regression coverage added.

## Risk Controls & Escalation

- **Governance bypass detected**: Block merge, escalate to security-council, add regression test before retry.
- **Schema drift**: Require version bump and diff approval; regenerate snapshots before merging.
- **CI instability**: Stop merges, engage DevAgent-CI and OpsAgent to restore deterministic parity.
- **Evidence gaps**: Release Captain halts GA declaration until evidence directories are complete and signed.
- **Operator visibility gap**: If dashboards cannot answer what/where/why within 5 minutes, treat as P1, roll back to last known-good logging/tracing config, and add observability regression coverage.
- **Threat model divergence**: If new attack surfaces emerge, SecAgent must refresh the threat model and mitigation mapping before further deployments.

## Post-Merge Validation Plan

- Run full GA CI gates on `main` to regenerate the merge-safe artefact.
- Execute smoke + governance/provenance bypass regression suite.
- Validate dashboards with fresh correlation IDs and trace spans from a synthetic incident drill.
- Re-run schema diff to ensure snapshots match deployed APIs.
- Publish a post-merge validation summary (tests executed, artefacts produced, detected drifts) to `audit/ga-evidence/ci/post-merge/VALIDATION.md` with links to logs and dashboards.
- Capture and store evidence of SOC 2 control adherence (Security, Availability, Processing Integrity, Confidentiality, Privacy) for the release in `audit/ga-evidence/security/post-merge/`.

## Forward-Looking Enhancements

- Add automated provenance/verdict contract checks to API code generators to prevent drift.
- Introduce chaos scenarios that deliberately drop provenance or verdicts to harden enforcement paths.
- Explore distributed tracing sampling strategies tuned for governance decisions to aid forensic audits.
- Pilot L4 autonomous rollback hooks that trigger on governance/provenance violations detected by runtime SLO monitors, with human-in-the-loop overrides documented.
- Build schema-diff attestation signed by Release Captain for each GA release and publish alongside API documentation.
