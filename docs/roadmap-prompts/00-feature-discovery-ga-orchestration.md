# Prompt #00: Feature Discovery -> GA Orchestration

**Target**: Governance + Delivery Orchestration  
**Owner**: Codex / Release Captain  
**Depends on**: `prompts/ga/feature-discovery-ga-development@v1.md`, prompt registry integrity, GA evidence bundle tooling

---

## Objective

Run a deterministic, evidence-first orchestration loop that:

1. discovers candidate underdeveloped features,
2. selects one by explicit scoring,
3. drives that feature through GA implementation standards, and
4. emits verifiable evidence artifacts for merge readiness.

---

## Pre-Flight Checklist

```bash
# Prompt registry includes immutable hash
rg -n "ga-feature-discovery-prompt" prompts/registry.yaml

# Canonical prompt artifact exists
test -f prompts/ga/feature-discovery-ga-development@v1.md

# Roadmap JSON is parseable
node -e "JSON.parse(require('fs').readFileSync('docs/roadmap/STATUS.json','utf8')); console.log('ok')"
```

---

## Execution Command Pack

```bash
# 1) Create evidence bundle for this orchestration run
make ga-prompt00-scaffold RUN_ID=$(date -u +%Y%m%d-%H%M)

# 2) Verify bundle integrity
make ga-prompt00-verify RUN_ID=<same-run-id>

# 3) Optional one-shot smoke
make ga-prompt00-smoke RUN_ID=$(date -u +%Y%m%d-%H%M)
```

---

## Required Inputs

- Repository root path
- Timeline target (weeks or sprints)
- Priority constraints (security-critical, user-facing, compliance, etc.)

---

## Required Outputs (Strict Order)

1. UEF evidence bundle
2. high-level summary + seventh-order implications
3. full architecture and integration map
4. implementation diff (no placeholders)
5. tests (unit/integration/e2e/perf/security)
6. documentation (dev + ops + API)
7. CI/CD gates and quality evidence
8. PR package and reviewer checklist
9. post-GA roadmap
10. final GA checklist

---

## Canonical Prompt

Use the registered canonical prompt verbatim:

- `prompts/ga/feature-discovery-ga-development@v1.md`

If this file hash diverges from `prompts/registry.yaml`, execution is invalid until reconciled.

