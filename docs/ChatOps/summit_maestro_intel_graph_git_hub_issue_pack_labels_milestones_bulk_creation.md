# Summit Maestro + IntelGraph — GitHub Issue Pack (Labels, Milestones, Bulk Creation)

**Last Updated:** 2025‑08‑31 • **Owner:** Platform PM • **Scope:** Ready‑to‑use GitHub Issues to drive Maestro (the Conductor) to completion and to complete IntelGraph adoption/integration.

> This pack includes: label/milestone setup, a full issue catalog (titles, bodies, AC/DoD, deps), and scripts to bulk‑create via `gh` CLI.

---

## 0) Repository Assumptions

- **Maestro repo:** `github.com/your‑org/maestro`
- **IntelGraph repo:** `github.com/your‑org/intelgraph`
- You can run the same label/milestone setup in both repos.

---

## 1) Standard Labels

Run once per repo.

```bash
# scripts/github_setup_labels.sh
set -euo pipefail
REPO=${1:?"usage: $0 owner/repo"}

# Type
gh label create --repo "$REPO" "type:feature"       -c '#0e8a16' -d 'New functionality'
gh label create --repo "$REPO" "type:bug"            -c '#d73a4a' -d 'Defect'
gh label create --repo "$REPO" "type:chore"          -c '#c5def5' -d 'Maintenance'

# Priority
gh label create --repo "$REPO" "priority:P0" -c '#b60205' -d 'Blocker'
gh label create --repo "$REPO" "priority:P1" -c '#d93f0b' -d 'High'
gh label create --repo "$REPO" "priority:P2" -c '#fbca04' -d 'Medium'

# Size (story points mapping: S≈3, M≈5, L≈8, XL≈13)
gh label create --repo "$REPO" "size:S"  -c '#d4c5f9'
gh label create --repo "$REPO" "size:M"  -c '#bfd4f2'
gh label create --repo "$REPO" "size:L"  -c '#bfdadc'
gh label create --repo "$REPO" "size:XL" -c '#c2e0c6'

# Areas (Maestro)
for L in control-plane workflow runners sdk policy provenance console observability blueprints security integration docs catalog finops; do
  gh label create --repo "$REPO" "area:$L" -c '#0366d6' || true
done

# Areas (IntelGraph adoption)
for L in sig-api sig-ui sig-policy sig-export sig-ingest sig-observability; do
  gh label create --repo "$REPO" "area:$L" -c '#5319e7' || true
done

# Release targets
gh label create --repo "$REPO" mvp -c '#0052cc' -d 'Target MVP (Oct 15, 2025)'
gh label create --repo "$REPO" ga  -c '#1d76db' -d 'Target GA (Dec 15, 2025)'

echo "✅ Labels created for $REPO"
```

---

## 2) Milestones

```bash
# scripts/github_setup_milestones.sh
set -euo pipefail
REPO=${1:?"usage: $0 owner/repo"}

gh milestone create --repo "$REPO" --title "MVP" --due-date 2025-10-15 --description "Maestro MVP per PRD"
gh milestone create --repo "$REPO" --title "GA"  --due-date 2025-12-15 --description "Maestro v1.0 GA"
gh milestone create --repo "$REPO" --title "v1.x (H1 2026)" --description "Post-GA improvements"

echo "✅ Milestones created for $REPO"
```

---

## 3) Bulk Issue Creator (using `gh`)

Provide issues as JSONL and a Node script to create them. Works for **both** repos.

```bash
# scripts/issues_create.sh
set -euo pipefail
REPO=${1:?"usage: $0 owner/repo"}
FILE=${2:?"usage: $0 owner/repo issues.jsonl"}
while IFS= read -r line; do
  title=$(echo "$line" | jq -r .title)
  body=$(echo  "$line" | jq -r .body)
  labels=$(echo "$line" | jq -r '.labels | join(",")')
  milestone=$(echo "$line" | jq -r '.milestone // empty')
  if [[ -n "$milestone" ]]; then
    gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels" --milestone "$milestone"
  else
    gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels"
  fi
  echo "Created: $title"
  sleep 0.2
done < "$FILE"
```

---

## 4) Maestro Issue Catalog (JSONL)

> Save as `issues/maestro_issues.jsonl` and run: `bash scripts/issues_create.sh your-org/maestro issues/maestro_issues.jsonl`

```jsonl
{"title":"Control Plane API skeleton (/workflows, /runs)","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:control-plane","mvp"],"body":"**Description**\nScaffold REST/gRPC for /workflows and /runs with authn/z stubs.\n\n**Acceptance Criteria**\n- [ ] POST /workflows stores signed manifest and returns digest\n- [ ] GET/POST /runs basic lifecycle (start, status)\n- [ ] Unauth requests return 401\n\n**Definition of Done**\n- [ ] Unit tests ≥80% for handlers\n- [ ] OTel traces/logs present\n- [ ] Docs: API reference stub\n\n**Dependencies**\n- None"}
{"title":"Scheduler & Queue MVP","milestone":"MVP","labels":["type:feature","priority:P1","size:L","area:control-plane","mvp"],"body":"**Description**\nPriority queue with lease/heartbeat; retries with backoff+jitter.\n\n**Acceptance Criteria**\n- [ ] p95 decision < 500ms @ 100 RPS\n- [ ] Retries follow policy (maxAttempts, backoff)\n- [ ] Leases renewed; orphan detection\n\n**DoD**\n- [ ] Load test profile checked into repo\n- [ ] Metrics exported (scheduler.latency, queue.depth)"}
{"title":"Metadata Store for Runs/Tasks","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:control-plane","mvp"],"body":"**Description**\nPersist Run and TaskExec with transitions; list/filter.\n\n**AC**\n- [ ] CRUD with optimistic concurrency\n- [ ] Filter by time/status/workflowRef\n\n**DoD**\n- [ ] Schema migration scripts\n- [ ] Backup/restore doc"}
{"title":"Health endpoints & SLO monitors","milestone":"MVP","labels":["type:chore","priority:P2","size:S","area:control-plane","mvp"],"body":"**AC**\n- [ ] /healthz, /readyz endpoints\n- [ ] 99.9% control-plane availability SLO dashboards"}
{"title":"Manifest parser & schema validation","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:workflow","mvp"],"body":"**AC**\n- [ ] JSON Schema enforced for Workflow/Runbook\n- [ ] Helpful errors with path+line\n- [ ] CI validator script wired"}
{"title":"DAG builder with dependencies","milestone":"MVP","labels":["type:feature","priority:P1","size:L","area:workflow","mvp"],"body":"**AC**\n- [ ] fan-out/fan-in, conditionals\n- [ ] deterministic topo order\n- [ ] unit tests for edge cases"}
{"title":"Retries/Timeouts/Guards","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:workflow","mvp"],"body":"**AC**\n- [ ] per-task retry policy\n- [ ] global workflow timeout\n- [ ] circuit-break on N failures"}
{"title":"Task caching & deterministic replay","milestone":"GA","labels":["type:feature","priority:P2","size:L","area:workflow","ga"],"body":"**AC**\n- [ ] Cache hit on identical inputs+code digest\n- [ ] Replay artifacts hash-equal"}
{"title":"Runner: Kubernetes Jobs","milestone":"MVP","labels":["type:feature","priority:P1","size:L","area:runners","mvp"],"body":"**AC**\n- [ ] Namespaced isolation\n- [ ] Resource classes\n- [ ] Logs streaming to Console"}
{"title":"Runner: Container (local daemon)","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:runners","mvp"],"body":"**AC**\n- [ ] Local container exec\n- [ ] Artifacts mount\n- [ ] Exit codes → status"}
{"title":"Runner: Local Dev CLI","milestone":"MVP","labels":["type:feature","priority:P2","size:S","area:runners","mvp"],"body":"**AC**\n- [ ] CLI runs workflow locally with mock secrets\n- [ ] Emits traces\n- [ ] Quickstart doc"}
{"title":"Runner: Serverless adapter (alpha)","milestone":"GA","labels":["type:feature","priority:P2","size:M","area:runners","ga"],"body":"**AC**\n- [ ] Invoke function on demand\n- [ ] Idempotent retries documented"}
{"title":"SDK: Task/Connector ABI (TypeScript)","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:sdk","mvp"],"body":"**AC**\n- [ ] init/validate/execute/emit lifecycle\n- [ ] Types published\n- [ ] Sample task"}
{"title":"SDK: Python (alpha)","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:sdk","mvp"],"body":"**AC**\n- [ ] Parity minimal set\n- [ ] Publish to internal index\n- [ ] Docs"}
{"title":"Samples & Quickstarts","milestone":"MVP","labels":["type:chore","priority:P2","size:S","area:sdk","docs","mvp"],"body":"**AC**\n- [ ] Hello-task, connector skeleton, e2e example"}
{"title":"Policy gate client & purpose binding","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:policy","mvp"],"body":"**AC**\n- [ ] PDP call requires purpose/authority/license\n- [ ] Denials halt task with reason\n- [ ] Decision logged"}
{"title":"Policy annotations in manifest","milestone":"MVP","labels":["type:feature","priority:P2","size:S","area:policy","mvp"],"body":"**AC**\n- [ ] Manifests carry policy context\n- [ ] Surface in run logs"}
{"title":"Immutable policy decision logs (WORM)","milestone":"GA","labels":["type:feature","priority:P2","size:S","area:policy","ga"],"body":"**AC**\n- [ ] Decision logs to WORM store\n- [ ] Correlation IDs"}
{"title":"Provenance receipts (alpha)","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:provenance","mvp"],"body":"**AC**\n- [ ] Inputs hash, code digest, outputs hash, signer\n- [ ] Receipt stored & fetchable"}
{"title":"Console: show receipts","milestone":"MVP","labels":["type:feature","priority:P2","size:S","area:provenance","area:console","mvp"],"body":"**AC**\n- [ ] Link from run to receipt\n- [ ] Download JSON"}
{"title":"Disclosure packager (GA)","milestone":"GA","labels":["type:feature","priority:P1","size:L","area:provenance","ga"],"body":"**AC**\n- [ ] Bundle artifacts+receipts\n- [ ] Verify on import"}
{"title":"Supply‑chain attestations (in‑toto/SLSA)","milestone":"GA","labels":["type:feature","priority:P2","size:M","area:security","ga"],"body":"**AC**\n- [ ] Attestation per release\n- [ ] Signature verifiable"}
{"title":"Console: Runs list & detail","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:console","mvp"],"body":"**AC**\n- [ ] Filter by status/workflow/namespace\n- [ ] Task tree + logs"}
{"title":"Console: Retry/Cancel actions","milestone":"MVP","labels":["type:feature","priority:P2","size:S","area:console","mvp"],"body":"**AC**\n- [ ] Retry idempotent\n- [ ] Cancel updates status"}
{"title":"Console: DAG visualization","milestone":"GA","labels":["type:feature","priority:P2","size:M","area:console","ga"],"body":"**AC**\n- [ ] Graph view with task states\n- [ ] Critical path highlight"}
{"title":"Metrics & traces (OTel)","milestone":"GA","labels":["type:feature","priority:P1","size:M","area:observability","ga"],"body":"**AC**\n- [ ] Standard metrics exported\n- [ ] Traces linked to SIG ops"}
{"title":"Dashboards: MTTR/success/backlog","milestone":"GA","labels":["type:feature","priority:P2","size:S","area:observability","ga"],"body":"**AC**\n- [ ] Prebuilt dashboards\n- [ ] SLO alerts"}
{"title":"Budgets/Quotas per namespace","milestone":"GA","labels":["type:feature","priority:P2","size:M","area:observability","area:finops","ga"],"body":"**AC**\n- [ ] Budget guard fails task pre‑exec\n- [ ] Usage reports exportable"}
{"title":"Reference tasks (10)","milestone":"MVP","labels":["type:feature","priority:P1","size:L","area:catalog","mvp"],"body":"**AC**\n- [ ] HTTP, gRPC, Kafka/NATS, S3/Blob, DB RW, schema‑validate, notify, wait, approval gate, SIG ingest\n- [ ] Examples + docs"}
{"title":"Cataloged runbooks (8)","milestone":"MVP","labels":["type:feature","priority:P1","size:L","area:catalog","mvp"],"body":"**AC**\n- [ ] Dev bootstrap, demo seed, ingest backfill, schema replay, chaos drill, disclosure packager (stub), deploy promote, rollback"}
{"title":"Blueprint: CI/CD for SIG services","milestone":"GA","labels":["type:feature","priority:P2","size:M","area:blueprints","ga"],"body":"**AC**\n- [ ] Template compiles/tests/deploys with env promotion & approvals"}
{"title":"Blueprint: Data/ETL for SIG","milestone":"GA","labels":["type:feature","priority:P2","size:M","area:blueprints","ga"],"body":"**AC**\n- [ ] Ingest→validate→enrich→handoff\n- [ ] Contract tests vs SIG"}
{"title":"Image signing & verification (cosign)","milestone":"GA","labels":["type:feature","priority:P1","size:M","area:security","ga"],"body":"**AC**\n- [ ] Keyless signing in CI\n- [ ] Verification in runner"}
{"title":"SBOM generation","milestone":"GA","labels":["type:chore","priority:P2","size:S","area:security","ga"],"body":"**AC**\n- [ ] SBOM attached to releases; stored/queryable"}
{"title":"CIS hardening checks","milestone":"GA","labels":["type:chore","priority:P2","size:M","area:security","ga"],"body":"**AC**\n- [ ] Benchmarks pass thresholds; exceptions tracked"}
{"title":"SIG Integration: Ingest API client","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:integration","mvp"],"body":"**AC**\n- [ ] Batch + stream clients\n- [ ] Schema versioning"}
{"title":"SIG Integration: Claims/Provenance API client","milestone":"MVP","labels":["type:feature","priority:P1","size:S","area:integration","mvp"],"body":"**AC**\n- [ ] Register claims\n- [ ] Link receipts"}
{"title":"SIG Integration: Allow‑listed runbook triggers","milestone":"GA","labels":["type:feature","priority:P2","size:S","area:integration","ga"],"body":"**AC**\n- [ ] SIG can trigger approved runbooks; PDP enforced"}
{"title":"SIG Integration: Contract tests in CI","milestone":"GA","labels":["type:chore","priority:P1","size:M","area:integration","ga"],"body":"**AC**\n- [ ] Breaking change blocks merge\n- [ ] N‑2 compatibility verified"}
```

> The catalog above creates **~36 Maestro issues** (more below in §6 for IntelGraph adoption).

---

## 5) Optional: Issue Templates (Issue Forms)

Create in `/.github/ISSUE_TEMPLATE/`.

**feature_request.yml**

```yaml
name: Feature request
description: Propose new functionality
labels: ["type:feature"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What problem does this solve?
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposal
      description: Describe the solution
  - type: textarea
    id: ac
    attributes:
      label: Acceptance Criteria
      description: List checkboxes of AC
```

**bug_report.yml**

```yaml
name: Bug report
labels: ["type:bug"]
body:
  - type: input
    id: version
    attributes:
      label: Version
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
```

---

## 6) IntelGraph Adoption Issue Catalog (JSONL)

> Save as `issues/intelgraph_adoption.jsonl` and run against the **IntelGraph** repo: `bash scripts/issues_create.sh your-org/intelgraph issues/intelgraph_adoption.jsonl`

```jsonl
{"title":"Expose stable Ingest API (batch/stream)","milestone":"MVP","labels":["type:feature","priority:P1","size:M","area:sig-ingest","mvp"],"body":"**Description**\nStabilize /ingest/batch and streaming topics (ingest.*) for Maestro.\n\n**AC**\n- [ ] JSON schema versioned\n- [ ] Idempotency keys\n- [ ] Signed requests validated\n\n**DoD**\n- [ ] API docs published\n- [ ] Contract tests green in CI"}
{"title":"Claims/Provenance API endpoint","milestone":"MVP","labels":["type:feature","priority:P1","size:S","area:sig-api","mvp"],"body":"**AC**\n- [ ] POST /claims/register stores receipts and links to cases\n- [ ] AuthZ via PDP"}
{"title":"Export/Disclosure API for packager","milestone":"GA","labels":["type:feature","priority:P2","size:M","area:sig-export","ga"],"body":"**AC**\n- [ ] Request export bundle with hash manifests\n- [ ] Verify receipts on import"}
{"title":"Unify PDP (OPA) between SIG & Maestro","milestone":"MVP","labels":["type:chore","priority:P1","size:M","area:sig-policy","mvp"],"body":"**AC**\n- [ ] Shared policy bundles\n- [ ] Reason‑for‑access logged"}
{"title":"UI: show Maestro run link on case/audit views","milestone":"MVP","labels":["type:feature","priority:P2","size:S","area:sig-ui","mvp"],"body":"**AC**\n- [ ] Correlation ID renders as deep link to Maestro run\n- [ ] Permission‑checked"}
{"title":"UI: surface provenance receipts","milestone":"GA","labels":["type:feature","priority:P2","size:S","area:sig-ui","ga"],"body":"**AC**\n- [ ] Download/view receipt JSON\n- [ ] Verify indicator shows valid signature"}
{"title":"SIG observability: link traces to Maestro","milestone":"GA","labels":["type:chore","priority:P2","size:S","area:sig-observability","ga"],"body":"**AC**\n- [ ] Propagate trace/span IDs\n- [ ] Dashboard panels for cross‑system flows"}
{"title":"Allow‑listed runbook triggers (SIG → Maestro)","milestone":"GA","labels":["type:feature","priority:P2","size:S","area:sig-ui","ga"],"body":"**AC**\n- [ ] Trigger button visible per policy\n- [ ] Audit log with purpose/authority"}
{"title":"Demo/seed integration with Maestro runbooks","milestone":"MVP","labels":["type:chore","priority:P2","size:S","area:sig-ingest","mvp"],"body":"**AC**\n- [ ] Seeded datasets load via runbook\n- [ ] Reset script available"}
{"title":"SIG CI: enforce Maestro contract tests","milestone":"GA","labels":["type:chore","priority:P1","size:S","area:sig-api","ga"],"body":"**AC**\n- [ ] CI job runs against Maestro mock\n- [ ] Fail on breaking changes"}
```

This adds **10 IntelGraph issues** to drive adoption/completion.

---

## 7) How to Run

1. Create labels & milestones:
   - `bash scripts/github_setup_labels.sh your-org/maestro`
   - `bash scripts/github_setup_labels.sh your-org/intelgraph`
   - `bash scripts/github_setup_milestones.sh your-org/maestro`
   - `bash scripts/github_setup_milestones.sh your-org/intelgraph`
2. Create issues:
   - `bash scripts/issues_create.sh your-org/maestro issues/maestro_issues.jsonl`
   - `bash scripts/issues_create.sh your-org/intelgraph issues/intelgraph_adoption.jsonl`

---

## 8) Optional — GitHub Project (Beta) board

```bash
# Requires: gh >= 2.32
ORG=your-org
PROJECT_TITLE="Maestro Delivery"
PROJECT_ID=$(gh project create --title "$PROJECT_TITLE" --format json | jq -r .id)

echo "Project ID: $PROJECT_ID"
# Add fields (Status, Milestone, Size already present depending on default). You can add views/filters via UI.
```

---

## 9) Notes

- You can extend the JSONL files with assignees via `--assignee` in the script or by adding a field and mapping.
- If a label exists already, the setup script continues (`|| true`).
- The issue bodies use checklists so progress rolls up in Projects.
