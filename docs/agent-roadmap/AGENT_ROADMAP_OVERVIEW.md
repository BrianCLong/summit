# Agent Roadmap Overview

The Agent Roadmap Orchestrator provides a single, governed catalog of major sprints so humans and
agents select the next best sprint without ad hoc prompt creation. The authoritative roadmap lives
in `configs/agent-roadmap/ROADMAP.yaml`, and every roadmap artifact must align with the Summit
Readiness Assertion and governance constitution.

## Core principles

- **Single source of truth**: `configs/agent-roadmap/ROADMAP.yaml` is authoritative.
- **Read-only planning by default**: the planner emits recommendations and artifacts, not branches
  or issues, unless policy explicitly enables automation.
- **Governed alignment**: all sprint prompts and evidence must align to governance authority files.

## How to use

1. Review the roadmap catalog and prerequisites:
   - `configs/agent-roadmap/ROADMAP.yaml`
2. Run the planner to suggest the next sprint:
   - `node scripts/agent-roadmap/plan_next_sprint.mjs --agent=jules --focus=ga_governance --explain`
3. Open the suggested prompt and execute it:
   - `.agentic-prompts/roadmap/<sprint_id>.md`

## Planner outputs

- **Console summary** with the top 1–3 candidate sprints.
- **Artifact JSON** written to `artifacts/agent-roadmap/PLAN_<timestamp>.json` containing ranked
  candidates, reasons, and prompt paths.

## Governance alignment

- Authority files: `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`,
  and `docs/governance/META_GOVERNANCE.md`.
- Governed exceptions are recorded explicitly and referenced in roadmap artifacts.
