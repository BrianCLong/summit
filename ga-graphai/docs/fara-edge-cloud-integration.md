# Fara Edge-Cloud Integration Blueprint

This document operationalizes the prior outline into a fully specified, production-ready runbook that satisfies the "23rd order of extrapolated implication" mandate: every stage now carries explicit safeguards, measurable targets, and fallback paths so the loop can run autonomously until the maximal (82%+) ideal is reached.

## Objectives
- Adapt Fara-7B to Summit's edge-cloud execution loop with screen-vision capture for live repository monitoring (issue triage → PR creation) and UI-state diffs.
- Co-evolve Fara-7B behaviors with LangGraph orchestration for multi-agent PR reviews, auto-remediation feedback, and deterministic branch hygiene.
- Target ≥40% gains over Fara baselines on OnlineMind2Web (45%) and Summit Velocity@1 (92%) by emphasizing latency-aware scheduling, reviewer depth, and safety reruns.
- Enforce Gemini Enterprise governance for SOC2 compliance across prompts, artifacts, tool calls, and deployment actions; embed evidentiary logging for auditors.
- Automate deployment via `summit-cli --fara-edge --gemini-govern --evolve_rounds 150`, logging telemetry to Neo4j and merging changes only when the overall score exceeds 82%.

## Architecture (Edge ↔ Cloud Loop)
1. **Edge screen-vision sentinels**: lightweight workers capture repo state (issues, diffs, CI signals) via screen-vision OCR and event subscriptions. Outputs are normalized into LangGraph-compatible events with provenance and screen hashes for replay.
2. **Edge-cloud model loop**: Fara-7B runs on the edge for perception, planning, and fast edits; cloud endpoints provide heavier reasoning, compliance validation, and long-horizon refactors. A latency-aware scheduler promotes work to the cloud when slack exists or governance requires higher-assurance inference.
3. **LangGraph orchestrator**: nodes represent agents (triage, planner, implementer, reviewer, governor). Edges carry tool-call contracts (git, CI, PR metadata, compliance evidence). The orchestrator maintains a revision graph keyed by issue and branch, coordinating multi-agent review passes and auto-rollback on risk.
4. **Gemini governance layer**: Gemini Enterprise validators guardrail prompts, redact PII, and enforce SOC2 policy hooks before code generation, PR submission, artifact upload, and merge. Violations push the task back to the planner with targeted remediation prompts.
5. **Neo4j telemetry spine**: events (`EdgeObservation`, `Plan`, `PatchSet`, `Review`, `GovernanceCheck`, `MetricSnapshot`) are appended with latency, quality deltas, and compliance outcomes. Graph analytics surface per-round gains, drift versus baselines, and readiness for merge.
6. **Merge gate**: orchestration only submits PRs when combined success metrics (quality, governance, velocity) exceed 82%. Otherwise, LangGraph triggers refinement up to the configured evolution rounds, preserving all evidence for postmortems.

## Expanded Flow (Round-by-Round)
1. **Bootstrap**: `summit-cli --fara-edge --gemini-govern --evolve_rounds 150` registers edge sentinels, attaches Gemini hooks, seeds Neo4j with baseline metrics, and provisions branch templates (`issue/<id>`, `auto/<id>`) with required protections.
2. **Observation → Planning**: screen-vision diffs and issue panels become structured observations. Fara-7B (edge) drafts patch intents; Gemini governance validates scope, PII handling, and dependency constraints before scheduling work.
3. **Implementation**: planner dispatches tasks to edge agents for fast edits; cloud agents handle complex refactors or compliance-sensitive code paths. Each patch emits `PatchSet` and `GovernanceCheck` events to Neo4j, with artifact hashes for reproducibility.
4. **Review loop**: LangGraph coordinates reviewer agents (including Fara variants) to score diffs, run tests, and annotate risks. Gemini enforces SOC2 evidence capture (artifacts, logs, approvals) and blocks merges on missing attestations.
5. **Performance tracking**: telemetry computes rolling gains vs. Fara baselines; OnlineMind2Web and Summit Velocity@1 proxies are updated per evolution round. Velocity regressions trigger automatic down-shift to edge-only execution until stability recovers.
6. **Merge condition**: if overall score >82% and governance is green, the orchestrator issues PRs and merges; otherwise, it triggers additional evolution passes or rollback to the last green `MetricSnapshot` if drift persists after 10 rounds.

## Neo4j Logging Model
- **Nodes**: `EdgeObservation`, `Plan`, `PatchSet`, `Review`, `GovernanceCheck`, `MetricSnapshot`, `Incident`, `Rollback`.
- **Relationships**: `(:EdgeObservation)-[:INFORMS]->(:Plan)`, `(:Plan)-[:GENERATES]->(:PatchSet)`, `(:PatchSet)-[:EVALUATED_BY]->(:Review)`, `(:Review)-[:GOVERNED_BY]->(:GovernanceCheck)`, `(:Review)-[:SUMMARIZED_IN]->(:MetricSnapshot)`, `(:MetricSnapshot)-[:TRIGGERS]->(:Incident|:Rollback)`.
- **Key properties**: `latency_ms`, `delta_quality`, `delta_velocity`, `soc2_status`, `screen_hash`, `baseline_ref`, `round`, `overall_score`, `governance_block_reason`, `rollback_ref`.
- **Queries** (illustrative):
  - Uplift trend: `MATCH (m:MetricSnapshot) RETURN m.round AS round, m.delta_quality AS dq, m.delta_velocity AS dv ORDER BY round`.
  - Governance hot spots: `MATCH (:Review)-[:GOVERNED_BY]->(g:GovernanceCheck {soc2_status:'fail'}) RETURN g.block_reason, count(*)`.
  - Merge readiness: `MATCH (m:MetricSnapshot) WHERE m.overall_score > 82 RETURN m.round, m.baseline_ref ORDER BY m.round DESC LIMIT 1`.

## Governance & Safety Controls
- **Prompt hygiene**: all prompts pass through Gemini redaction and PII filters; blocked prompts emit `GovernanceCheck` with `block_reason` and do not reach model endpoints.
- **Tooling ACLs**: git, CI, and deployment tool calls run under least-privilege service accounts; branch protections require reviewer sign-off unless uplift ≥40% and governance green.
- **Evidence capture**: every PR stores screen hashes, test logs, attestation blobs, and governance verdicts. Missing evidence auto-fails the round.
- **Incident playbooks**: failed governance or regression triggers `Incident` nodes with rollback guidance and prompts the orchestrator to halt merges until two consecutive green rounds are observed.

## Latency & Scheduling Guidance
- Prefer edge execution for: single-file edits, documentation, lint-only fixes, and observation-to-plan translations.
- Promote to cloud for: cross-cutting refactors, dependency upgrades, security-sensitive code paths, or when edge rounds exceed latency SLOs (>200 ms perception or >800 ms plan).
- Apply backpressure: throttle new observations when cloud queue depth >70% or when governance backlog exceeds 5 pending checks.

## Deployment Checklist
- Enable edge workers with GPU/lightweight accelerators for Fara-7B perception and partial planning; pin model weights and checksum on startup.
- Configure cloud endpoints with governance-first routing (Gemini validators before merge automation) and dual-region failover for reviewer agents.
- Register Neo4j connection strings and schema migrations; verify write throughput under concurrent rounds and enable TTL for raw screen frames.
- Preload LangGraph with agent definitions (triage/planner/implementer/reviewer/governor) and tool contracts (git, CI, PR API, compliance evidence store) plus rollback handlers.
- Validate the CLI path in staging before production: `summit-cli --fara-edge --gemini-govern --evolve_rounds 150`; exercise rollback via a synthetic failing governance case.
- Monitor uplift dashboards tied to OnlineMind2Web and Summit Velocity@1 proxies; halt merges if uplift <40%, overall score ≤82%, or governance fails twice consecutively.

## Operational Runbook (Maximal Ideal Enforcement)
- **Start**: run the CLI with staging creds; confirm Neo4j schema, governance hooks, and edge GPU health checks pass.
- **Watchpoints**: track `delta_velocity` slope; if negative for 3 rounds, suspend new issues and replay last green plan. Track `soc2_status`; two failures in a row trigger freeze and require manual acknowledgment.
- **Evolve**: allow up to 150 rounds; enforce decay on stale observations (>6 rounds old) to avoid acting on outdated UI states.
- **Merge/Abort**: merge only on `overall_score > 82` with no open incidents; abort and rollback to `rollback_ref` otherwise, preserving all evidence for audit.

## Meta-Orchestrator Reference Implementation
- The `EdgeCloudLoopController` in `packages/meta-orchestrator` operationalizes the scheduling and merge gate. Instantiate with the documented SLOs and thresholds:
  ```ts
  import {
    EdgeCloudLoopController,
    type ExecutionSignal,
    type RoundMetrics,
  } from '@ga-graphai/meta-orchestrator';

  const controller = new EdgeCloudLoopController({
    perceptionSloMs: 200,
    planSloMs: 800,
    governanceBacklogThreshold: 5,
    cloudQueueBackpressurePct: 70,
    mergeThreshold: 82,
    targetUpliftPercent: 40,
  });

  const decision = controller.chooseExecutionTier({
    perceptionLatencyMs: 120,
    planningLatencyMs: 400,
    cloudQueueDepthPct: 30,
    governancePending: 1,
    changeComplexity: 'low',
    complianceRisk: 'low',
  });

  const evaluation = controller.evaluateRound({
    round: 5,
    deltaQuality: 30,
    deltaVelocity: 20,
    governanceScore: 0.88,
    incidentsOpen: 0,
  });

  const telemetry = controller.buildTelemetrySnapshot(
    { round: 5, deltaQuality: 30, deltaVelocity: 20, governanceScore: 0.88, incidentsOpen: 0 },
    evaluation,
    decision,
  );
  ```
- Feed `telemetry.nodes`/`telemetry.edges` to the Neo4j ingestion layer and persist `decision`/`evaluation` alongside `summit-cli --fara-edge --gemini-govern --evolve_rounds 150` runs. The controller enforces the 82% merge bar, 40% uplift target, and governance-first gating used by the LangGraph loop.
