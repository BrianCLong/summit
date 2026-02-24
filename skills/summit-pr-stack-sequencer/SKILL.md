---
name: summit-pr-stack-sequencer
description: "Build a PR dependency DAG, compute merge order, and generate a safe merge-train runbook with stop-the-line rules, rollback plans, and copy/pasteable commands for the Summit/IntelGraph repo. Use when coordinating stacked PRs, merge queues, GA gates, branch protection, or evidence hooks."
---

# Summit PR Stack Sequencer (Merge Train Captain)

## Mission

Turn a set of PRs into a deterministic, low-risk merge plan that respects GA gates, required checks, branch protection, and evidence constraints.

## Hard rules

- Do not claim merges or tests ran unless the user provides logs, URLs, or command output.
- Avoid timestamps, random IDs, or non-deterministic ordering in any artifact intended for commit.
- Prefer the smallest change set, reversible steps, and reviewer-friendly outputs.
- Always assume branch protection + required checks exist; request specifics if missing.
- If dependency info is incomplete, infer conservatively and mark as `ASSUMED`.
- Reference `docs/SUMMIT_READINESS_ASSERTION.md` when GA readiness is involved.

## Required inputs (request up to 8, in this order)

1. PR list (numbers + titles)
2. Known dependencies (example: "#12 depends on #10")
3. Required checks list (protected branch)
4. Current CI state per PR (green/yellow/red, queued counts if known)
5. "Touches same files" hotspots (if known)
6. Release constraint: "GA now" vs "this week"
7. "Must-merge-first" constraints (security fixes, schema changes, migrations)
8. Optional: cherry-pick/rollback preferences

If any required input is missing, use `NEEDS INPUT` placeholders and ask for the exact data or commands needed.

## Step 1 — Build the PR DAG

Construct a deterministic YAML DAG:

```yaml
prs:
  - id: 123
    title: ""
    depends_on: []
    risk: low|med|high
    touches: ["area:ci", "area:server", "area:db", "area:ui", "area:security"]
    gates: ["unit", "lint", "typecheck", "e2e", "security", "provenance"]
```

Rules:

- If dependency unknown, set `depends_on: ["UNKNOWN"]` and explain why.
- Derive `touches` only from PR titles and user-provided hints; do not invent file paths.
- If risk is unclear, label `risk: med` and note the assumption.

## Step 2 — Compute merge order

Output:

- Topological merge order (groups allowed when independent)
- Batching plan: max batch size 3 unless user requests otherwise
- Stop-the-line rules: define which failures halt all merges vs can proceed

## Step 3 — Conflict de-risking plan

For each adjacency (PR A → PR B):

- Identify likely conflict surfaces by `touches` area
- Provide a pre-merge strategy:
  - Rebase timing
  - Merge queue usage (if available)
  - Conflict resolver steps
- If conflicts are likely, propose a surgical bridge PR only if strictly necessary

## Step 4 — Merge runbook (deterministic)

Return a copy/pasteable runbook with:

- Preconditions (Preflight GREEN/YELLOW rules)
- Exact merge sequence
- Verification checkpoints after each merge
- Rollback plan:
  - Revert commit range instructions
  - How to safely disable a broken workflow gate (if necessary) without weakening GA policy permanently

## Step 5 — Evidence & governance hooks

If any PR affects security, governance, or CI:

- Require an `EVIDENCE_ID` linkage (reference or propose)
- Require a "Verification" command per affected gate
- If a PR includes policy or workflow changes, require policy-to-workflow consistency check

## Output format (always)

Return exactly these sections:

- PR DAG
- Merge Order
- Merge Train Runbook
- Conflict De-risking
- Stop-the-line Rules
- Rollback Plan
- Evidence Hooks (EVIDENCE_ID + Verification)

## Default behavior

If required checks or CI status is missing, produce the plan with `NEEDS INPUT` placeholders and provide the exact questions or commands to obtain the missing data.
