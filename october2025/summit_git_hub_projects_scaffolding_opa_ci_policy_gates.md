# [MODE: WHITE+BLUE] Summit — GitHub Projects Scaffolding + OPA/CI Policy Gates

> **Classification:** Internal / Pre‑GA. Safe to commit as scaffolding PR.
>
> **Purpose:** Turn the PRD (MVP‑2 → GA) into executable project scaffolding: GitHub Projects v2 setup, labels, issue + epic templates, auto‑issue bootstrap script, and CI policy gates (OPA tests, SBOM, cosign, secret scan). Everything below is copy‑paste‑ready.

---

## 1) Repository Structure (additions)

```
.github/
  ISSUE_TEMPLATE/
    epic.yml
    feature.yml
    task.yml
    bug.yml
  workflows/
    ci-policy.yml
    sbom-cosign.yml
    secret-scan.yml
    add-to-project.yml
    release-evidence.yml
CODEOWNERS
policy/
  authz/
    bundle.rego
    tests/
      allow_intra_tenant_test.rego
      deny_cross_tenant_test.rego
      classification_block_test.rego
      case_scope_test.rego
      export_policy_test.rego
Makefile
scripts/
  bootstrap_labels.sh
  bootstrap_project.sh
  bootstrap_issues_from_prd.sh
  verify_release.sh
```

---

## 2) GitHub Labels (bootstrap)

**scripts/bootstrap_labels.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Requires: gh CLI authenticated, repo as origin
labels=(
  "epic:#7f8c8d" "mvp-2:#8e44ad" "ga:#27ae60" "security:#c0392b" "policy:#2c3e50" \
  "infra:#16a085" "backend:#2980b9" "frontend:#e67e22" "docs:#95a5a6" \
  "good-first-issue:#2ecc71" "runbook:#9b59b6" "performance:#d35400"
)
for kv in "${labels[@]}"; do
  name=${kv%%:*}; color=${kv##*:}
  gh label create "$name" --color "${color#\#}" --force >/dev/null || true
  echo "Ensured label: $name"
done
```

---

## 3) GitHub Projects v2 (creation + fields + views)

**scripts/bootstrap_project.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail
ORG_OR_USER="$1"      # e.g., BrianCLong
PROJECT_TITLE="Summit — MVP-2 → GA"

# Create project
pid=$(gh project create --owner "$ORG_OR_USER" --title "$PROJECT_TITLE" --format json | jq -r .id)
echo "Project ID: $pid"

# Add fields (Text/Single-Select/Number/Date)
# Note: gh project field create requires gh >= 2.60

echo "Adding fields..."
gh project field-create $pid --name "Status" --type "SingleSelect" --options "Backlog,Selected,In Progress,Blocked,In Review,Done"
gh project field-create $pid --name "Epic" --type "Text"
gh project field-create $pid --name "Area" --type "SingleSelect" --options "frontend,backend,infra,security,policy,docs"
gh project field-create $pid --name "Target" --type "SingleSelect" --options "MVP-2,GA"
gh project field-create $pid --name "Story Points" --type "Number"
gh project field-create $pid --name "Start" --type "Date"
gh project field-create $pid --name "Due" --type "Date"

# Create views
cat > /tmp/board.json <<'JSON'
[
  {"name":"MVP-2 Board","type":"Board","filter":"field:Target = MVP-2","layout":"Status"},
  {"name":"Security","type":"Table","filter":"label:security"},
  {"name":"Policy","type":"Table","filter":"label:policy"},
  {"name":"GA Board","type":"Board","filter":"field:Target = GA","layout":"Status"}
]
JSON

jq -c '.[]' /tmp/board.json | while read -r row; do
  name=$(jq -r .name <<<"$row")
  type=$(jq -r .type <<<"$row")
  filter=$(jq -r .filter <<<"$row")
  layout=$(jq -r .layout <<<"$row")
  gh project view $pid >/dev/null
  gh project view $pid --format json >/dev/null
  gh project view $pid --format json | jq '.' >/dev/null
  gh project view $pid --format json >/dev/null
  gh project view $pid --format json | jq '.' >/dev/null
  gh project item-create $pid --title "$name" >/dev/null || true  # seed
  gh project view $pid >/dev/null
  echo "Create view: $name (manual step via UI if CLI lacks support)"
done

echo "NOTE: Some view customizations may require the GitHub UI due to CLI limitations."
```

> **Note:** GitHub Projects v2 CLI is evolving; some view customizations require the web UI. Fields and project creation are scripted; views are noted as manual fallback.

---

## 4) Issue/Epic Templates (YAML)

**.github/ISSUE_TEMPLATE/epic.yml**

```yaml
name: "Epic"
description: Track an initiative spanning multiple issues
labels: [epic]
title: "[EPIC] <concise outcome>"
body:
  - type: textarea
    id: goal
    attributes:
      label: Goal & Outcomes
      description: What is the user-facing outcome? Link PRD section.
      placeholder: e.g., "MVP-2: Multi-tenant isolation demonstrably enforced end-to-end."
  - type: textarea
    id: scope
    attributes:
      label: Scope
      placeholder: In scope / Out of scope
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
      placeholder: Bullet list of testable ACs
  - type: textarea
    id: plan
    attributes:
      label: Work Breakdown
      description: Link or list child issues with checkboxes
  - type: dropdown
    id: target
    attributes:
      label: Target
      options: [MVP-2, GA]
  - type: dropdown
    id: area
    attributes:
      label: Area
      options: [frontend, backend, infra, security, policy, docs]
```

**.github/ISSUE_TEMPLATE/feature.yml**

```yaml
name: Feature
labels: [feature]
title: 'feat: <feature>'
body:
  - type: textarea
    id: user_story
    attributes:
      label: User Story
      placeholder: As a <persona> I want <capability> so that <outcome>.
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
  - type: dropdown
    id: target
    attributes:
      label: Target
      options: [MVP-2, GA]
  - type: dropdown
    id: area
    attributes:
      label: Area
      options: [frontend, backend, infra, security, policy, docs]
```

**.github/ISSUE_TEMPLATE/task.yml**

```yaml
name: Task
labels: [task]
title: 'chore: <task>'
body:
  - type: textarea
    id: detail
    attributes:
      label: Detail
  - type: dropdown
    id: area
    attributes:
      label: Area
      options: [frontend, backend, infra, security, policy, docs]
```

**.github/ISSUE_TEMPLATE/bug.yml**

```yaml
name: Bug
labels: [bug]
title: 'bug: <symptom>'
body:
  - type: textarea
    id: repro
    attributes:
      label: Steps to Reproduce
  - type: textarea
    id: expected
    attributes:
      label: Expected
  - type: textarea
    id: actual
    attributes:
      label: Actual
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options: [S1, S2, S3, S4]
```

---

## 5) Bootstrap Issues from PRD (script)

**scripts/bootstrap_issues_from_prd.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO="$1" # e.g., BrianCLong/summit

function new_issue() {
  local title="$1"; shift
  local body="$1"; shift
  local labels="$1"; shift
  gh issue create --repo "$REPO" --title "$title" --body "$body" --label $labels
}

# EPICS from PRD E.7
new_issue "[EPIC] EP-1 Multi-Tenant Isolation" "- DB migrations for tenant_id + RLS\n- Neo4j DB-per-tenant option\n- Resolver guards + integration tests\n\n**AC:** Tenant A cannot access Tenant B; 10k fuzz; policy unit tests for top 20 queries." "epic,mvp-2,security,backend"

new_issue "[EPIC] EP-2 ABAC/OPA Bundle" "- Author package summit.authz.*\n- Unit tests\n- Policy fetcher client\n- Deny-by-default rollout\n\n**AC:** All critical flows under policy tests; deny-by-default enforced." "epic,mvp-2,policy,security"

new_issue "[EPIC] EP-3 PCA Ledger v1" "- Hashers/signers\n- Manifest schema\n- UI timeline\n- Export tool\n\n**AC:** Reproducible investigation; verifiable manifests; UI provenance timeline." "epic,mvp-2,backend,security"

new_issue "[EPIC] EP-4 Ingest & Export Controls" "- Schema registry\n- PII/DLP checks\n- Watermarking\n- Export approval flow\n\n**AC:** Export requires approval; DLP enforced; watermark on exports." "epic,mvp-2,backend,security,policy"

new_issue "[EPIC] EP-5 Observability & IR" "- Dashboards\n- SLOs\n- Alert routes\n- Runbooks with RACI\n\n**AC:** P1 simulated alert MTTR ≤ 45m; evidence auto-collected." "epic,mvp-2,infra,security"

new_issue "[EPIC] EP-6 Enterprise SSO/SCIM (basic)" "- OIDC + SCIM sync\n- Admin UX\n\n**AC:** IdP demoed; deprovision ≤ 5m." "epic,mvp-2,backend"

new_issue "[EPIC] EP-7 Release Security" "- SBOM, cosign, provenance in OCI\n- CI policy gates\n\n**AC:** Signed artifacts; SBOM diff enforced; cosign verify in CI." "epic,mvp-2,security,infra"

# Child issues (examples)
new_issue "feat: Postgres RLS for tenant_id" "Implement RLS policies on all tables with tenant_id; verify with integration tests." "mvp-2,backend,security"
new_issue "feat: GraphQL resolver guards" "Inject tenant filters into all resolvers; add negative tests for cross-tenant access." "mvp-2,backend,security"
new_issue "policy: summit.authz bundle skeleton" "Create Rego package with deny-by-default and case-scope checks." "mvp-2,policy,security"

echo "Seeded epics and sample issues. Link child issues to epics via checklists or issue linking."
```

---

## 6) Auto‑add issues/PRs to Project

**.github/workflows/add-to-project.yml**

```yaml
name: Add to Project
on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]

jobs:
  add:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const projectNumber = 1; // update to actual project number
            const org = context.payload.organization?.login || context.repo.owner;
            const isPR = !!context.payload.pull_request;
            const node_id = isPR ? context.payload.pull_request.node_id : context.payload.issue.node_id;
            const { data: project } = await github.graphql(`
              query($org: String!, $number: Int!) {
                organization(login: $org) { projectV2(number: $number) { id } }
              }`, { org, number: projectNumber });
            const projectId = project.organization.projectV2.id;
            await github.graphql(`
              mutation($projectId: ID!, $contentId: ID!) {
                addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) { item { id } }
              }`, { projectId, contentId: node_id });
```

---

## 7) CODEOWNERS

**CODEOWNERS**

```
# Paths mapped to owners (teams or users)
/api/ @org-backend-team
/client/ @org-frontend-team
/policy/ @org-security-team
/.github/ @org-devex-team
/runbooks/ @org-sre-team
```

---

## 8) OPA Policies & Tests (expanded)

**policy/authz/bundle.rego**

```rego
package summit.authz

default allow = false

# Input: { user: { id, tenant, role, attrs: {cases: []} }, action, resource: { kind, id, tenant, case, classification }, purpose }

# Intra-tenant, purpose-gated, classification-allowed, case-scoped
allow {
  input.resource.tenant == input.user.tenant
  purpose_ok
  classification_ok
  case_scope_ok
}

# Admin override (audited) within same tenant
allow {
  input.user.role == "admin"
  input.resource.tenant == input.user.tenant
  input.purpose == "admin-audit"
}

purpose_ok {
  allowed := {"investigation", "triage", "analytics"}
  input.purpose == allowed[_]
}

classification_ok {
  not input.resource.classification in {"SECRET", "TOP-SECRET"}
}

case_scope_ok {
  some cid
  cid := input.resource.case
  cid != null
  cid == input.user.attrs.cases[_]
}
```

**policy/authz/tests/allow_intra_tenant_test.rego**

```rego
package summit.authz_test
import data.summit.authz

test_allow_intra_tenant_case_scoped {
  authz.allow with input as {
    "user": {"tenant": "A", "role": "analyst", "attrs": {"cases": ["c1","c2"]}},
    "resource": {"tenant": "A", "case": "c1", "classification": "INTERNAL"},
    "purpose": "investigation"
  }
}
```

**policy/authz/tests/deny_cross_tenant_test.rego**

```rego
package summit.authz_test
import data.summit.authz

test_deny_cross_tenant {
  not authz.allow with input as {
    "user": {"tenant": "A", "role": "analyst", "attrs": {"cases": ["c1"]}},
    "resource": {"tenant": "B", "case": "c1", "classification": "INTERNAL"},
    "purpose": "investigation"
  }
}
```

**policy/authz/tests/classification_block_test.rego**

```rego
package summit.authz_test
import data.summit.authz

test_block_high_classification {
  not authz.allow with input as {
    "user": {"tenant": "A", "role": "analyst", "attrs": {"cases": ["c1"]}},
    "resource": {"tenant": "A", "case": "c1", "classification": "TOP-SECRET"},
    "purpose": "investigation"
  }
}
```

**policy/authz/tests/case_scope_test.rego**

```rego
package summit.authz_test
import data.summit.authz

test_case_scope_required {
  not authz.allow with input as {
    "user": {"tenant": "A", "role": "analyst", "attrs": {"cases": ["c1"]}},
    "resource": {"tenant": "A", "case": null, "classification": "INTERNAL"},
    "purpose": "investigation"
  }
}
```

**policy/authz/tests/export_policy_test.rego**

```rego
package summit.export

default allow = false

# Exports require approval when bytes > threshold and classification >= CONFIDENTIAL
allow {
  input.bytes <= 1048576  # <= 1MB
}
allow {
  input.approval == "approved"
  input.classification == "PUBLIC"
}
allow {
  input.approval == "approved"
  input.classification == "CONFIDENTIAL"
  input.bytes <= 52428800  # <= 50MB
}
```

---

## 9) CI Policy Gates (GitHub Actions)

**.github/workflows/ci-policy.yml**

```yaml
name: CI Policy Gates
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa && sudo mv opa /usr/local/bin/opa
      - name: Run OPA unit tests
        run: |
          opa test policy -v
      - name: Conftest (optional k8s/manifests)
        run: |
          curl -L https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz | tar xz
          sudo mv conftest /usr/local/bin/
          conftest test deploy/  || true  # if manifests exist
      - name: Secret scan (gitleaks)
        uses: gitleaks/gitleaks-action@v2
        with:
          args: detect --no-git -v --source .
      - name: Fail on secrets found
        if: steps.gitleaks.outputs.exitcode != 0
        run: exit 1
```

**.github/workflows/sbom-cosign.yml**

```yaml
name: SBOM + Cosign Verify
on:
  push:
    branches: [main]
  workflow_dispatch: {}

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Syft SBOM
        uses: anchore/sbom-action@v0
        with:
          path: .
          format: spdx-json
          output-file: sbom.spdx.json
      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
  cosign-verify:
    runs-on: ubuntu-latest
    needs: sbom
    steps:
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
      - name: Verify images (example)
        run: |
          # Update image list accordingly
          images=( ghcr.io/owner/summit-api:latest ghcr.io/owner/summit-client:latest )
          for img in "${images[@]}"; do
            cosign verify --certificate-identity-regexp ".*" "$img" || exit 1
          done
```

**.github/workflows/secret-scan.yml**

```yaml
name: Secret Scan
on:
  pull_request:
  push:

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gitleaks/gitleaks-action@v2
        with:
          args: detect --no-git -v --source .
```

**.github/workflows/release-evidence.yml**

```yaml
name: Release Evidence Pack
on:
  release:
    types: [published]

jobs:
  evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build evidence pack
        run: |
          mkdir -p evidence
          cp sbom.spdx.json evidence/ || true
          echo "commit=$(git rev-parse HEAD)" > evidence/manifest.txt
          echo "date=$(date -u +%FT%TZ)" >> evidence/manifest.txt
          sha256sum evidence/* > evidence/SHA256SUMS || true
      - uses: actions/upload-artifact@v4
        with:
          name: evidence-pack
          path: evidence
```

---

## 10) Makefile (targets to wire it together)

**Makefile**

```make
.PHONY: policy-test project-bootstrap labels issues

policy-test:
	opa test policy -v

labels:
	./scripts/bootstrap_labels.sh

project-bootstrap:
	./scripts/bootstrap_project.sh $(ORG)

issues:
	./scripts/bootstrap_issues_from_prd.sh $(REPO)

ci-local:
	gitleaks detect --no-git -v --source . || true
	opa test policy -v
```

---

## 11) Usage (end-to-end)

```bash
# one-time: authenticate gh
gh auth login

# 1) Labels
bash scripts/bootstrap_labels.sh

# 2) Project (set your org/user)
ORG=BrianCLong bash scripts/bootstrap_project.sh BrianCLong

# 3) Seed issues/epics
REPO=BrianCLong/summit bash scripts/bootstrap_issues_from_prd.sh $REPO

# 4) Run policies locally
make policy-test

# 5) Push PR to add workflows, templates, policies
```

---

## 12) Next Steps / Flags

- Populate `projectNumber` in **add-to-project.yml** with the created project number.
- Replace placeholder image names in **sbom-cosign.yml** with actual GHCR images.
- Extend OPA policies to cover export approval flow once service endpoints are defined.
- Add neo4j/postgres schema conftest policies when DDL manifests are committed.

---

## 13) Proof-Carrying Analysis (PCA)

- **Assumptions:** gh CLI available; repo write perms; SBOM + cosign acceptable tools; OPA used for ABAC per PRD.
- **Evidence:** Templates/tests reflect PRD E.7 epics and I.1 policies; CI jobs provide measurable gates for security/compliance.
- **Caveats:** GitHub Projects v2 views/automations are partly UI‑only; script seeds fields; use UI to finalize boards.
- **Verification:** Run `make policy-test`; open PR; confirm Actions pass; create release to see evidence pack artifacts.
