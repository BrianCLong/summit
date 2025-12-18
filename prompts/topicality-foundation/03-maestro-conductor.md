# Prompt 3: Maestro Conductor - Run & Artifact Schema + Minimal Orchestrator

**Tier:** 1 - Platform Services
**Priority:** ⭐️ HIGH PRIORITY
**Effort:** 1.5 weeks
**Dependencies:** Prompts 1, 2
**Blocks:** Prompts 5, 6, 8
**Parallelizable:** Yes (with Prompts 4, 7)

---

You are Claude Code, an AI software engineer for Topicality.

Context:
- "Maestro Conductor" is our orchestration layer: it represents plans, runs, and artifacts, with budgets and attestations.
- Every significant workflow should have a run_id, steps, inputs, outputs, and links to IntelGraph and claim ledger entries.

Goal:
Design and implement a FIRST SLICE of Maestro:
- Data model for Plans, Runs, and Artifacts.
- A simple orchestrator service that:
  - creates runs,
  - tracks step status,
  - stores artifacts metadata,
  - links to provenance.

Assumptions:
- Use the same stack as IntelGraph for simplicity (e.g., TypeScript/Node + Postgres or Python/FastAPI + Postgres).
- Focus on internal API (we don't need a fancy UI yet).

Requirements:
1. Data model
   - Plan: id, name, description, owner, created_at, steps_spec (JSON).
   - Run: run_id, plan_id, status (pending/running/succeeded/failed), start/end timestamps, owner, budget (time/cost), parent_run_id (optional).
   - Step: step_id, run_id, name, status, start/end timestamps, logs_ref, error_info.
   - Artifact: artifact_id, run_id, type (document, report, model, dataset, "disclosure_pack"), location (URL/path), claim_ledger_ref (optional).

2. Orchestrator API
   - Create plan.
   - Start run from plan (create run and initial steps).
   - Update step status, attach logs_ref and error_info.
   - Attach artifacts to a run.
   - Query:
     - get_run(run_id) with steps and artifacts.
     - list_runs with filters (status, owner, date range).

3. Provenance integration
   - Runs and artifacts should include optional references to:
     - IntelGraph entity_ids and claim_ledger_manifest IDs/paths.
   - Provide sample integration stubs for how a step might call the claim ledger library and attach manifest IDs.

4. Tests & docs
   - Unit tests for core models and APIs.
   - README explaining:
     - Concepts (Plan, Run, Step, Artifact).
     - How to start a run and record artifacts.
     - How to query run history.

Deliverables:
- DB schema/migrations.
- Service code (API).
- Example script that:
  - creates a plan,
  - starts a run,
  - simulates a few steps,
  - attaches a sample artifact.

Proceed step-by-step: schema design → API design → implementation → tests → examples → docs.
