# Learning Artifact Inventory & Classification

This inventory establishes a single source of truth for all learning artifacts (models, prompts, policies with adaptive logic, feature builders, and optimizers). Every artifact must be registered before it is introduced into any environment.

## Scope of Artifacts

- **Models**: Predictive, scoring, ranking, clustering, generation, and optimization models (including lightweight heuristics with learned weights).
- **Prompts**: System, agent, routing, guard, tool-calling prompts, and prompt-optimization policies.
- **Policies with learned components**: Rules whose thresholds or actions adapt based on feedback (e.g., dynamic rate limits, risk scoring cutoffs).
- **Feature extractors / aggregations**: Embedding pipelines, featurizers, aggregation logic, and post-processing heuristics that change model inputs or outputs.
- **Optimizers and evaluators**: Auto-tuners, bandits, self-play evaluators, reinforcement or curriculum optimizers.

## Inventory Registration Requirements

Each artifact must have a registration record stored in `artifacts/learning/status/<artifact_id>.json` created via `scripts/learning/promote_artifact.sh` with the following fields:

| Field               | Description                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `artifact_id`       | Stable identifier (kebab-case).                                                                    |
| `type`              | `model`, `prompt`, `policy`, `feature`, `optimizer`, or `evaluator`.                               |
| `determinism`       | `deterministic` or `probabilistic` (document random seeds and RNG strategy for the latter).        |
| `operational_scope` | `advisory` (human-in-the-loop), `action-eligible` (auto-execution allowed), or `simulation-only`.  |
| `approval_mode`     | `human-approved` (explicit reviewer sign-off) or `automated` (pre-approved autopilot with gating). |
| `owner`             | Accountable DRI (person, not a bot) with escalation deputy.                                        |
| `data_lineage`      | Training/evaluation datasets and licenses.                                                         |
| `version`           | Semantic version string (see lifecycle).                                                           |
| `status`            | `draft`, `evaluated`, `approved`, or `active`.                                                     |
| `provenance_ref`    | Link to evidence bundle, PR, and evaluation reports.                                               |
| `change_risk`       | `low`, `medium`, or `high` with rationale.                                                         |

## Classification Axes

- **Determinism**: Identify randomness sources, seed strategy, and reproducibility guarantees.
- **Operational authority**:
  - _Advisory_: Outputs require human confirmation.
  - _Action-eligible_: May trigger actions; requires elevated controls, multi-stage approval, and rollback readiness.
  - _Simulation-only_: Experimental; cannot affect production pathways.
- **Approval pathway**:
  - _Human-approved_: Explicit review and sign-off documented in provenance.
  - _Automated_: Pre-approved under strict gating (e.g., continuous promotion with hard thresholds and guardrails).

## Intake & Update Workflow

1. Reserve an `artifact_id` and create a registration entry using `scripts/learning/promote_artifact.sh <artifact_id> <version> draft <evidence_path>`.
2. Populate the registration fields in `artifacts/learning/status/<artifact_id>.json`; align evidence paths with `docs/governance/EVALUATION_GATES.md`.
3. Classify determinism, operational authority, and approval pathway; flag action-eligible artifacts for enhanced review.
4. Attach evaluation and bias reports before moving beyond `draft`.
5. Promotion, rollback, and auditability follow the lifecycle rules in `docs/governance/LEARNING_LIFECYCLE.md`.

## Inventory Hygiene & Audits

- Weekly sanity check: `scripts/ci/verify-learning-change.sh` ensures required documents and scripts exist.
- Quarterly inventory review (see `GOVERNANCE_CADENCE.md`): verify owners, versions, and operational scopes; retire stale artifacts to `simulation-only` or archive with provenance.
- Any unregistered artifact discovered in code or configuration is treated as a policy violation and must be quarantined until registered and evaluated.
