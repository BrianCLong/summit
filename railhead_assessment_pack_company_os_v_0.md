# Railhead Assessment Pack — CompanyOS v0.1

**Objective**  
Rapidly establish an auditable baseline of our code repos, runtime environments, CI/CD gates, observability, and security posture. All outputs are evidence artifacts committed to `companyos/railhead` (or a chosen ops repo) with signed releases.

---

## 0) Deliverables (Evidence or it didn’t happen)
- **Repo Inventory**: `artifacts/repo-inventory.{csv,json}`
- **CI/CD Gate Matrix**: `artifacts/ci-gates-matrix.csv` (per repo: tests, SAST, SBOM, sig, vuln budget, branch protections)
- **Org/Project Controls Snapshot**: `artifacts/org-controls.json` (2FA/MFA, SSO, secret scanning, allowed actions)
- **Environment Map**: `artifacts/env-map.yaml` (clouds, clusters, namespaces, data stores, ingress, identities)
- **Observability Baseline**: `artifacts/slo-snapshots/` (SLOs, dashboards, alert rules)
- **Security Posture Report**: `artifacts/security-posture.md` (CVE counts, top risks, signing %, policy violations)
- **Risk Ledger**: `artifacts/risk-ledger.csv` (owner, impact, likelihood, burn-down plan)
- **ADR(s)**: `adr/0001-railhead-baseline.md` (scope + decisions), `adr/0002-ci-gate-minimums.md`
- **Runbooks**: `runbooks/railhead-assessment.md` (how to re-run), `runbooks/rollback.md`

> All artifacts produced via scripts below; commit with signed tags; attach SBOM to releases.

---

## 1) Prereqs & Tooling
Install on the ops workstation/runner:
- **Git/GitHub**: `gh` CLI, GPG or Sigstore key, jq, yq
- **Containers**: Docker/Podman
- **Security**: `trivy`, `syft`, `grype`, `cosign`, `gitleaks`
- **Policy**: `opa`, `conftest`, `checkov`, `terrascan`
- **Cloud** (as applicable): `aws`, `gcloud`, `az`, `kubectl`, `helm`

> Ensure least-privilege read perms across repos, GitHub org admin **read** scope for settings, and cloud read-only roles.

---

## 2) Repo Discovery (GitHub example)

**2.1 Org snapshot**
```bash
mkdir -p artifacts && : > artifacts/repo-inventory.json
ORG="your-org"
# Org controls
gh api -H "Accept: application/vnd.github+json" \
  /orgs/$ORG | jq '{login, two_factor_requirement_enabled, members_can_create_repositories, default_repository_permission, plan}' \
  > artifacts/org-controls.json
# Secret scanning / dependabot / policies
gh api /orgs/$ORG/security-managers > artifacts/org-security-managers.json || true
```

**2.2 Repos, protections, workflows**
```bash
# List repos (non-archived)
gh api --paginate /orgs/$ORG/repos?per_page=100 \
  | jq -r '.[] | select(.archived==false) | {name, private, default_branch, visibility, language, \
           topics, license: .license.spdx_id, pushed_at, \
           branch_protection: "N/A", workflows:[], required_checks:[], \
           secret_scanning: .security_and_analysis.secret_scanning.status, \
           dependabot: .security_and_analysis.dependabot_security_updates.status}' \
  > artifacts/repos.raw.json

# Enrich with branch protection & required checks
jq -r '.[].name' artifacts/repos.raw.json | while read REPO; do
  DEF=$(gh api /repos/$ORG/$REPO | jq -r .default_branch)
  BP=$(gh api -X GET \
       /repos/$ORG/$REPO/branches/$DEF/protection 2>/dev/null | \
       jq '{enforce_admins: .enforce_admins.enabled, required_reviews: .required_pull_request_reviews != null, \
            require_signatures: .required_signatures.enabled // false, \
            status_checks: (.required_status_checks.contexts // []), \
            require_linear_history: .required_linear_history.enabled // false, \
            restrictions: .restrictions != null}')
  WF=$(gh api -X GET /repos/$ORG/$REPO/actions/workflows | jq '[.workflows[].name]')
  echo $(jq --arg REPO "$REPO" --argjson BP "$BP" --argjson WF "$WF" \
     '(.[] | select(.name==$REPO)) as $r | ($r + {branch_protection:$BP, workflows:$WF})' artifacts/repos.raw.json) \
     | jq . > artifacts/tmp.$REPO.json
done
jq -s 'flatten' artifacts/tmp.*.json > artifacts/repo-inventory.json
rm artifacts/tmp.*.json
```

**2.3 CSV for quick review**
```bash
jq -r '
  ("repo,private,default_branch,license,last_push,secret_scanning,dependabot,required_checks,require_signatures") ,
  (.[] | [ .name, .private, .default_branch, (.license//""), .pushed_at, (.secret_scanning//""), (.dependabot//""),
            (.branch_protection.status_checks|join(";")), (.branch_protection.require_signatures|tostring) ] | @csv)
' artifacts/repo-inventory.json > artifacts/repo-inventory.csv
```

---

## 3) CI/CD Gate Baseline (Actions example)

**Minimums we expect (draft — see ADR 0002):**
- Unit tests + coverage gate on PR
- SAST/secret scan on PR
- SBOM generation on build; attach to release
- Image signing (`cosign sign`) and verify on deploy (`cosign verify`)
- Vulnerability budget gate (e.g., block > High without waiver)
- Rollback job tested; env protections on production

**3.1 Extract workflows & checks**
```bash
mkdir -p artifacts/ci && : > artifacts/ci-gates-matrix.csv
printf "repo,workflow,has_tests,has_sbom,has_sign,has_sast,has_vuln_gate,prod_env_protection\n" > artifacts/ci-gates-matrix.csv
jq -r '.[].name' artifacts/repo-inventory.json | while read REPO; do
  gh api /repos/$ORG/$REPO/contents/.github/workflows?ref=$(jq -r ".[]|select(.name==\"$REPO\").default_branch" artifacts/repo-inventory.json) \
    | jq -r '.[].download_url' 2>/dev/null | while read URL; do
      curl -s $URL -o wf.yml
      HAS_TEST=$(yq '..|. as $item ireduce ("false"; . or ( ($item.type == "string") and ($item | test("(pytest|npm test|go test|mvn test)")) ))' wf.yml)
      HAS_SBOM=$(yq '.. | select(tag=="!!str") | select(test("syft|cyclonedx|sbom")) | any' wf.yml >/dev/null && echo true || echo false)
      HAS_SIGN=$(yq '.. | select(tag=="!!str") | select(test("cosign sign|sigstore")) | any' wf.yml >/dev/null && echo true || echo false)
      HAS_SAST=$(yq '.. | select(tag=="!!str") | select(test("codeql|semgrep|sast|bandit|gosec")) | any' wf.yml >/dev/null && echo true || echo false)
      HAS_VULN=$(yq '.. | select(tag=="!!str") | select(test("trivy|grype")) | any' wf.yml >/dev/null && echo true || echo false)
      PROD_PROT=$(gh api /repos/$ORG/$REPO/environments/production 2>/dev/null | jq -r '.protection_rules|length>0')
      printf "%s,%s,%s,%s,%s,%s,%s,%s\n" "$REPO" "$(basename $URL)" "$HAS_TEST" "$HAS_SBOM" "$HAS_SIGN" "$HAS_SAST" "$HAS_VULN" "$PROD_PROT" >> artifacts/ci-gates-matrix.csv
    done
done
```

---

## 4) Environment Map (cloud + k8s)

Create `artifacts/env-map.yaml` with this schema and fill via commands below.
```yaml
clouds:
  - provider: aws|gcp|azure
    accounts_projects: ["prod", "staging", "dev"]
    networking:
      vpcs: []
      peering: []
    data:
      stores:
        - type: rds|spanner|cosmos|s3|gcs|blob
          name: ""
          contains_pii: false
          residency: us|eu|...
    identities:
      human_access: sso|mfa
      workload_id: iam roles / workload identity pool
kubernetes:
  - cluster: name
    context: kubeconfig-context
    version: x.y
    namespaces: [app, ops]
    ingress: [gateway]
    service_accounts: []
terraform:
  backends: []
  state_buckets: []
```

**Discovery commands (examples)**
```bash
# AWS
aws organizations list-accounts --query 'Accounts[].{Name:Name,Id:Id}' > artifacts/aws-accounts.json || true
aws eks list-clusters --region us-east-1 > artifacts/aws-eks.json || true

# GCP
gcloud projects list --format=json > artifacts/gcp-projects.json || true
gcloud container clusters list --format=json > artifacts/gke.json || true

# Azure
az account list -o json > artifacts/az-subscriptions.json || true
az aks list -o json > artifacts/aks.json || true

# K8s
kubectl config get-contexts -o name > artifacts/kube-contexts.txt || true
for CTX in $(cat artifacts/kube-contexts.txt); do
  kubectl --context $CTX version --short > artifacts/k8s-$CTX.version.txt || true
  kubectl --context $CTX get ns -o json > artifacts/k8s-$CTX.namespaces.json || true
  kubectl --context $CTX get ingress -A -o json > artifacts/k8s-$CTX.ingress.json || true
  kubectl --context $CTX get sa -A -o json > artifacts/k8s-$CTX.serviceaccounts.json || true
done
```

---

## 5) Observability Baseline

**5.1 SLO capture**  
Document current targets and error budgets per service: `artifacts/slo-snapshots/<service>.yaml`
```yaml
service: api-gateway
slo:
  availability: 99.9
  latency_p50_ms: 50
  latency_p95_ms: 200
error_budget_window: 28d
alerts:
  - name: api-availability-budget-burn
    condition: burn_rate>2 over 6h
 dashboards: ["grafana:uid/abc123"]
```

**5.2 Prometheus/Grafana scrape**
```bash
# Prometheus targets & rules
curl -s http://<prometheus>/api/v1/targets > artifacts/prom-targets.json || true
curl -s http://<prometheus>/api/v1/rules > artifacts/prom-rules.json || true
# Grafana dashboards list (service account token required)
curl -s -H "Authorization: Bearer $GRAFANA_TOKEN" \
  https://<grafana>/api/search?query=&type=dash-db > artifacts/grafana-dashboards.json || true
```

---

## 6) Security Posture (SBOMs, vulns, signing, secrets)

**6.1 SBOM + vuln scan (per repo/image)**
```bash
mkdir -p artifacts/sbom artifacts/vulns
REPO_DIRS=$(jq -r '.[].name' artifacts/repo-inventory.json)
for R in $REPO_DIRS; do
  # Build image if Dockerfile exists
  if gh api /repos/$ORG/$R/contents/Dockerfile >/dev/null 2>&1; then
    git clone --depth=1 https://github.com/$ORG/$R tmp/$R && pushd tmp/$R
    docker build -t local/$R:railhead . || true
    syft packages local/$R:railhead -o cyclonedx-json > ../../artifacts/sbom/$R.cdx.json || true
    grype local/$R:railhead -o json > ../../artifacts/vulns/$R.grype.json || true
    trivy image --scanners vuln,secret --format json -o ../../artifacts/vulns/$R.trivy.json local/$R:railhead || true
    popd && rm -rf tmp/$R
  fi
done
```

**6.2 Signature verification (if using cosign)**
```bash
IMAGES=$(grep -R "image:" -h services/ | awk '{print $2}' | sort -u || true)
for IMG in $IMAGES; do
  cosign verify $IMG --certificate-identity-regexp ".*" --certificate-oidc-issuer-regexp ".*" \
    > artifacts/signature-$(${IMG//\//_}).txt 2>/dev/null || echo "$IMG: unsigned or unverifiable" >> artifacts/unsigned.txt
done
```

**6.3 Secret scanning (repos)**
```bash
gitleaks detect -s . -r artifacts/gitleaks.sarif || true
```

**6.4 IaC policy (Terraform/K8s)**
```bash
checkov -d infra/ -o json > artifacts/checkov.json || true
terrascan scan -o json -d infra/ > artifacts/terrascan.json || true
conftest test k8s/ -p policy/opa/ --update || true
```

---

## 7) Policy & Compliance Snapshot
- Data classification register: `artifacts/data-register.csv` (system, dataset, PII, residency, retention)
- Residency/region controls present? (OPA/ABAC policy bundles, gateway rules)
- DLP guards active on egress? (e.g., proxies, WAF rules)

**Template**
```csv
system,dataset,pii,retention,residency,owner,notes
intelgraph,events,true,365d,us,owner@example.com,hashed user ids only
```

---

## 8) Risk Ledger (rolling)
```csv
id,area,description,impact,likelihood,owner,mitigation,eta,status,evidence
R-001,Security,Unsigned images in prod,H,M,sec-lead,Enable cosign verify in deploy,2025-10-15,Open,artifacts/unsigned.txt
R-002,CI,No vuln gate on 7 repos,M,M,devx-lead,Add trivy + threshold gate,2025-10-05,Open,artifacts/ci-gates-matrix.csv
```

---

## 9) ADR Stubs

**adr/0001-railhead-baseline.md**
```md
# ADR 0001: Railhead Baseline
## Status
Proposed
## Context
We need an auditable baseline of repos, environments, CI/CD, and security controls.
## Decision
Adopt this Railhead Assessment Pack as the standard method and evidence set.
## Consequences
Repeatable, automatable baseline; informs Golden Path priorities and risk spend.
```

**adr/0002-ci-gate-minimums.md**
```md
# ADR 0002: CI/CD Minimum Gates
- PR: unit tests + coverage; SAST + secret scan
- Build: SBOM generation; image signing
- Release: attach SBOM; provenance attestation
- Deploy: vuln budget gate; cosign verify; prod env protection
```

---

## 10) Runbook: How to Re-run Baseline
1. Clone `companyos/railhead` (or ops repo) and copy this pack into `/ops/railhead/`.
2. Export context: `export ORG="your-org" PROM_URL=... GRAFANA_TOKEN=...`
3. Execute scripts in order: 2) Repo Discovery → 3) CI Gates → 4) Env Map → 5) Observability → 6) Security.
4. Commit artifacts; tag `railhead-YYYYMMDD`; sign tag; open PR with summary.
5. Update Risk Ledger and ADRs; schedule fixes with owners.

---

## 11) CI Gate Golden Snippets (drop-in)

**.github/workflows/security.yml**
```yaml
name: security
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]
jobs:
  sast_secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: 'javascript,python,go' }
      - uses: github/codeql-action/analyze@v3
      - uses: zricethezav/gitleaks-action@v2
  build_sbom_sign:
    needs: sast_secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: |
          docker build -t ${{ github.repository }}:${{ github.sha }} .
      - name: SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ github.repository }}:${{ github.sha }}
          format: cyclonedx-json
          output-file: sbom.cdx.json
      - name: Sign image
        run: |
          cosign sign --yes ${{ github.repository }}:${{ github.sha }}
  vuln_gate:
    needs: build_sbom_sign
    runs-on: ubuntu-latest
    steps:
      - name: Trivy scan
        uses: aquasecurity/trivy-action@0.24.0
        with:
          image-ref: ${{ github.repository }}:${{ github.sha }}
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'
```

**Deploy verify (pseudocode)**
```bash
cosign verify $IMAGE || exit 1
kubectl apply -f k8s/ && kubectl rollout status deploy/$APP --timeout=5m || rollback.sh
```

---

## 12) Acceptance Criteria (Definition of Done for Railhead)
- [ ] All deliverables present and signed in `artifacts/`
- [ ] CI Gates Matrix reviewed; gaps ticketed with owners
- [ ] Environment Map peer-reviewed; sensitive data locations tagged
- [ ] Observability snapshot linked to live dashboards
- [ ] Security posture includes SBOM coverage %, signing %, and CVE counts
- [ ] Risk ledger prioritized with burn-down dates

---

## 13) RACI
- **A**rchitect-General: scope, acceptance, prioritization
- **R** DevX Lead: repo/CI discovery, CI gate remediation
- **R** Sec Lead: SBOM, vuln, signing, secrets, policy scan
- **C** SRE Lead: env map, observability scrape
- **I** Product Owners: data classification, SLO confirmation

---

## 14) Next Moves (after baseline)
1. Wire the **Golden Path** templates into default repo scaffolds.
2. Enforce org-level controls (2FA/SSO, default branch protections, allowed actions).
3. Turn top-3 risks into week-long sprints wit