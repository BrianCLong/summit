#!/usr/bin/env bash
set -euo pipefail

# Requires: gh CLI authenticated with repo scope
# Usage: ./scripts/gh/create-sprint-v0_5.sh org/repo
REPO=${1:-}
if [[ -z "$REPO" ]]; then
  echo "Usage: $0 org/repo" >&2; exit 1
fi

echo "==> Using repo $REPO"

gh repo view "$REPO" >/dev/null || { echo "Repo not accessible"; exit 1; }

# Create labels (idempotent)
create_label(){
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" --repo "$REPO" 2>/dev/null || \
  gh label edit "$name" --color "$color" --description "$desc" --repo "$REPO"
}

create_label must FF0000 "Must-have (blockers)"
create_label should 1F6FEB "Should-have"
create_label ci 0E8A16 "CI/CD"
create_label security B60205 "Security/Policy"
create_label policy FBCA04 "OPA/ABAC"
create_label performance D93F0B "Perf/Load"
create_label observability 5319E7 "OTel/Grafana/Alerts"
create_label frontend A2EEEF "UI/E2E"
create_label test 0E8A16 "Tests/Evidence"
create_label release C5DEF5 "Release Train"

# Helper to create issues with multiline body
mkissue(){
  local title="$1" labels="$2" body="$3"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --body "$body"
}

mkissue "CI: SBOM + Vulnerability Gate" "security,ci,must" "Add Syft SBOM for all images and Grype scan; fail PR on High/Critical.

**AC**
- CI fails on Sev≥High
- SBOM artifacts uploaded
- Allowlist under 
'security/grype-allowlist.yaml'

**Deps**: Docker build job"

mkissue "CI: OPA Policy Simulation in PRs" "policy,ci,must" "Run 
'opa test policies/'
 with fixtures; publish JUnit.

**AC**
- CI fails on any policy test failure
- Artifacts include JUnit + coverage"

mkissue "CI: SLO Smoke (k6) as Quality Gate" "performance,ci,must" "Execute k6 
'tests/k6/smoke.js'
 against ephemeral env; assert GraphQL p95 thresholds.

**AC**
- Reads p95 ≤350ms; Writes p95 ≤700ms
- Artifacts: summary.json + JUnit"

mkissue "Gateway: OPA ABAC Enforcement" "backend,security,must" "Integrate OPA check in Apollo Gateway; deny cross‑tenant; apply purpose/retention tags.

**AC**
- Contract tests pass
- Redaction on sensitive fields
- Cross‑tenant returns 403 with audit"

mkissue "Policies: Baseline ABAC Rego + Tests" "policy,security,must" "Author 
'policies/abac.rego'
; add allow/deny fixtures & unit tests.

**AC**
- 
'opa test'
 green
- Coverage ≥90% on package 
'abac.authz'
"

mkissue "Perf: k6 Profiles (smoke, baseline, soak)" "performance,should" "Create 
'tests/k6'
 with smoke/baseline/soak; target top reads/writes/paths.

**AC**
- Thresholds wired; env via 
'.env'
"

mkissue "Observability: OTel Standardization" "observability,must" "Ensure Apollo spans with attributes: tenant, opName, purpose, cacheMode; export to OTLP.

**AC**
- Traces visible; attributes present; sampling rules documented"

mkissue "Dashboards & Alerts" "observability,must" "Add Grafana dashboards + Prometheus burn alerts per SLO and cost guardrail.

**AC**
- Dashboards imported
- Alerts firing in test"

mkissue "Frontend: Playwright Critical Flow" "frontend,test,should" "Auth → search → graph view e2e; add UX trace markers.

**AC**
- Test stable in CI; screenshots/artifacts uploaded"

mkissue "Release Train: Protection & Evidence Bundle" "release,ci,must" "Protect main with gates; auto‑tag v0.5‑guarded‑rail; attach evidence bundle.

**AC**
- Weekly cut→staging; biweekly prod if error‑budget ≥50%"

echo "==> Created labels and 10 issues for v0.5"
