# Deep Research Eval (GA)

This guide defines the Summit-native evaluation harness for deep research outputs. It is a
policy-aware, provenance-first gate that produces evidence bundles and CI-grade verdicts.

## Objectives

- Enforce task-specific success criteria over generic narrative quality.
- Produce deterministic, auditable evidence bundles (HTML + JSON + manifest).
- Apply tenant policy constraints to retrieval and fact-checking.
- Detect judge drift via stable scoring distributions over time.

## Evaluation Components

### Task Packs

Task packs define persona/tenant contexts, objectives, and policy constraints. Each task must
include:

- `id`, `topic`, `language`, `prompt`
- `persona` (tenant, industry, compliance regime)
- `policy` (allow/deny sources, jurisdiction, rate limit)
- `objectives` and `requiredSources`

### Filters

1. **Task Qualification** — ensures the prompt requires deep research.
2. **Search Necessity** — ensures external evidence is required.
3. **Access Feasibility** — checks policy allow/deny coverage before evaluation.

### Adaptive Rubrics

Rubrics are first-class artifacts with versioned dimensions:

- General quality (clarity, evidence, analysis)
- Governance (policy compliance, sensitive data handling, reproducibility)
- Task-specific objectives (auto-weighted)

### Active Fact Checking

The fact-checker extracts verifiable claims, retrieves evidence under policy constraints, and
labels claims as Right/Wrong/Unknown. Each claim stores a trace:

```
query plan -> sources -> snippets -> timestamp -> hash
```

### Evidence Bundles

Each evaluation run emits bundles at:

```
./artifacts/deep-research-eval/<run-id>/<task-id>/
  bundle.json
  report.html
  manifest.json
```

## CLI

```
summit eval deep-research \
  --taskpack packages/deep-research-eval/fixtures/taskpack.sample.json \
  --reports packages/deep-research-eval/fixtures/reports.sample.json \
  --out artifacts/deep-research-eval \
  --run-id sample-run \
  --dry-run
```

### Threshold Overrides

```
--thresholds '{"minScoreRatio":0.7,"minCoverageRatio":0.6,"maxContradictions":0}'
```

### Waivers

Provide a time-bounded waiver file (JSON):

```
{
  "expiresAt": "2026-02-15T00:00:00Z",
  "reason": "External source outage",
  "approvedBy": "governance-owner"
}
```

## CI Modes

- **Advisory (PRs):** run smoke pack, emit summary JSON, do not block merges.
- **Strict (GA/Release):** run full pack, fail on thresholds unless waiver valid.

## Evidence Expectations

- Store `summary.json` alongside bundles.
- Commit task packs and fixture reports to ensure deterministic regression coverage.
- Track rubric diffs over time to detect judge drift.

## Governance Alignment

- Policy constraints must be enforced as code; any deviations are treated as build-blocking.
- Evidence bundles must remain immutable and traceable by hash.
