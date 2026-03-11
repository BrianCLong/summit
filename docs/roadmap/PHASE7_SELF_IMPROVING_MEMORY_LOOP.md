# Phase 7 Blueprint: Self-Improving Memory & Continual Learning (Months 12–18)

## Summit Readiness Assertion

This blueprint operationalizes a governed, reversible self-improvement loop that converts proven agent outcomes into measurable model quality gains while preserving policy controls, evidence integrity, and human veto authority.

## Scope

Primary scope is **Phase 7, Item 24**:

- Provenance-ledger trajectories become anonymized training records.
- Nightly reflection reviews failed missions and proposes constrained patches.
- Fine-tuning runs on local infrastructure (Ollama + Axolotl) with deterministic rollback gates.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection in replay traces, poisoned successful runs, PII leakage in training corpora, regression from unsafe auto-patches.
- **Mitigations**:
  - policy-enforced anonymization and redaction before dataset admission,
  - confidence-weighted sampling with provenance quality thresholds,
  - canary evals + rollback trigger on benchmark regression,
  - mandatory human countersign before merging reflection-generated code changes.

## Proposed Folder Structure

```text
autonomy/
  memory-loop/
    README.md
    schemas/
      trajectory.schema.json
      training-example.schema.json
    pipelines/
      extract-successful-runs.ts
      anonymize-trajectories.ts
      build-lora-corpus.ts
    policies/
      memory_admission.rego
      redaction_policy.rego
    eval/
      benchmark-suite.yaml
      acceptance-thresholds.yaml

agents/
  reflection-agent/
    task-spec.json
    prompts/
      nightly-reflection.md
    src/
      replay-failures.ts
      generate-patch-plan.ts
      open-pr.ts

governance/
  decisions/
    ADR-AG-SELF-IMPROVEMENT-LOOP.md
  tradeoffs/
    tradeoff_ledger.jsonl

artifacts/
  autonomy/
    memory-loop/
      YYYY-MM-DD/
        dataset_manifest.json
        lora_train_report.json
        eval_report.json
        rollback_plan.json
```

## End-to-End Flow

1. **Extract** successful trajectories from provenance ledger where outcomes are tagged as verified.
2. **Sanitize** into a policy-compliant training format with deterministic redaction.
3. **Filter** with admission policy (quality score, completeness, legal/compliance checks).
4. **Fine-tune** local base model via LoRA (Axolotl), registered with versioned metadata.
5. **Evaluate** against standard benchmark suites and historical baselines.
6. **Promote or Roll Back** based on explicit acceptance thresholds.
7. **Reflect nightly** on failed missions, produce patch proposals, and open reviewable PRs.

## Sample Task Contract (Reflection Agent)

```json
{
  "taskId": "reflection-nightly-001",
  "agentId": "reflection-agent",
  "mode": "reasoning",
  "inputs": {
    "failedMissionWindowHours": 24,
    "maxMissions": 200,
    "evidenceUris": ["provenance://missions/failed/*"]
  },
  "outputs": {
    "report": "artifacts/autonomy/memory-loop/2026-03-08/reflection_report.json",
    "patchPlan": "artifacts/autonomy/memory-loop/2026-03-08/patch_plan.json"
  },
  "constraints": {
    "allowAutoMerge": false,
    "requireHumanCountersign": true,
    "reversible": true
  }
}
```

## Verification Gates (Tiered)

- **Tier A (Safety/Policy)**: redaction policy pass, no forbidden fields, compliance checks green.
- **Tier B (Quality)**: benchmark delta non-negative on precision/recall and hallucination rate.
- **Tier C (Operability)**: train/eval reproducibility and rollback rehearsal complete.

## Rollback Triggers

Rollback is immediate when any condition is met:

- hallucination benchmark degrades beyond threshold,
- provenance completeness drops below policy floor,
- privacy scanner detects unredacted sensitive content,
- reflection patch CI fails required gate suite.

## Initial Milestone Plan (Four Sprints)

1. **Sprint 1**: schemas + extraction pipeline + policy stubs + ADR draft.
2. **Sprint 2**: anonymization and dataset manifest pipeline + unit tests.
3. **Sprint 3**: local LoRA train/eval workflow + benchmark harness.
4. **Sprint 4**: nightly reflection agent + governed PR automation with human countersign.

## Definition of Done

- A nightly artifact bundle is generated with traceable dataset/build/eval lineage.
- Fine-tune promotion is blocked unless all tiers pass.
- Reflection-generated PRs are reproducible, reversible, and human-approved.
- Mean time-to-insight trend improves without policy regressions.
