# Railhead Pack Integration Guide

The Railhead operational readiness pack in Canvas delivers the full go-to-green bundle: one-click discovery, security baseline capture, governance scaffolding, and the evidence ledger required for launch certification. Use this guide to install the bundle, tailor automation to your environment, and extract the artifacts that demonstrate compliance.

---

## 1. Pack Contents at a Glance

| Asset bucket                                    | What you get                                                                                                                          | How it is used                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Evidence deliverables index                     | Starter `evidence-index/index.csv` and manifest wiring for downstream traceability.                                                   | Capture architecture decisions and attach proof to the readiness dossier without creating templates from scratch. |
| Discovery automations                           | Repo inventory (`repos.csv`), CI workflow digest (`ci-workflows.json`), environment topology map, and observability endpoint capture. | Build a current-state map of the delivery surface so remediation work can be prioritized with evidence.           |
| Gate minimums + drop-in GitHub Actions workflow | Reusable workflow (`ci/railhead-gates.yml`) plus default pass/fail thresholds (`gate-minimums.yaml`).                                 | Enforce the same launch criteria across services without hand-rolling pipelines.                                  |
| Governance toolkit                              | Risk ledger (`risk-ledger.csv` + summary), RACI matrix, Definition of Done checklist, and distribution plan for exec comms.           | Drive cross-functional alignment, assign owners, and show status in leadership reviews.                           |

If you simply need the default artifact set, unzip the pack and run the scripts in Section 4. If you want the automation tuned to your footprint, collect the tailoring inputs below first.

---

## 2. Prerequisites

1. **Workstation setup:** Git, Docker (BuildKit enabled), `jq`, and `yq` must be available in the shell that executes the scripts.
2. **Access:** Read access to the target GitHub organization, clouds (AWS/GCP/Azure) being mapped, and observability endpoints (Prometheus/Grafana). Supply service accounts with the minimal read scope.
3. **Credentials:** Export tokens via environment variables before execution (e.g., `export GITHUB_TOKEN=...`, `export AWS_PROFILE=railhead-readonly`). Scripts prompt when a variable is missing, but pre-seeding avoids interactive runs in CI.
4. **Workspace:** Place the pack at the root of a writable directory (local or ephemeral runner). Scripts create `artifacts/railhead/<timestamp>/` automatically.

> ✅ **Health check:** Run `./scripts/railhead/self-test.sh` to confirm dependencies and permissions before starting the full sweep. The script returns non-zero if a prerequisite is missing.

---

## 3. Tailoring Inputs

Collect these values if you want scoped discovery instead of the all-default run:

| Input                                    | Why it matters                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GitHub organization slug                 | Scopes org-wide discovery so the automation inventories all repositories, workflows, environments, and branch protections. |
| Cloud providers (AWS/GCP/Azure)          | Instructs the environment mapper to enumerate accounts, regions, and deployed services only where you operate.             |
| Prometheus/Grafana endpoints (read-only) | Allows the observability scrape to capture dashboards, alerts, SLO coverage, and screenshot evidence.                      |
| Additional SCM/CI systems                | Includes non-GitHub repos or pipelines (GitLab, Bitbucket, Jenkins, CircleCI) in the evidence trail.                       |
| Compliance tags or business units        | Optional filters so reports slice evidence by owning squad or regulated scope.                                             |

### Example `config/railhead.inputs.yaml`

Copy `config/railhead.inputs.example.yaml` to `config/railhead.inputs.yaml` and adjust the values for your estate.

```yaml
github:
  org: summit-systems
  additional_scm:
    - type: gitlab
      url: https://gitlab.example.com/groups/ml-platform
clouds:
  - aws
  - azure
observability:
  prometheus_endpoint: https://prom.example.com/api
  grafana_endpoint: https://grafana.example.com
filters:
  business_units:
    - payments
    - risk
```

Store secrets in your shell (not in the YAML) and reference them through environment variables the scripts consume (for example `PROM_TOKEN`, `GRAFANA_API_KEY`).

---

## 4. Execution Workflow

Follow this order to produce the initial artifact bundle. Each step is idempotent—rerun if new services appear or credentials are updated.

1. **Bootstrap configuration**

   ```bash
   ./scripts/railhead/bootstrap.sh --config config/railhead.inputs.yaml
   ```

   _Copies tailoring inputs, creates the artifact/log skeleton, and seeds `evidence-index/index.csv` plus the run manifest._

2. **Run discovery sweep**

   ```bash
   ./scripts/railhead/run-discovery.sh --repos --ci --env --observability
   ```

   _Generates `discovery/repos.csv`, `discovery/ci-workflows.json`, `discovery/environment-map.json`, and `discovery/observability/endpoints.json` so you can audit surface area quickly._

3. **Generate security baseline**

   ```bash
   ./scripts/railhead/security-baseline.sh --sbom --vulns --signing --secrets
   ```

   _Builds an aggregated npm SBOM, flags unpinned dependencies in `vulnerability-findings.csv`, documents signing posture guidance, and sweeps for leaked credentials using ripgrep._

4. **Load governance artifacts**

   ```bash
   ./scripts/railhead/load-governance.sh --risk-ledger --raci --dod
   ```

   _Derives `governance/risk-ledger.csv` from security findings, exports `raci.yaml`, and refreshes the Definition of Done checklist._

5. **Activate CI gates (optional but recommended)**

   ```bash
   ./scripts/railhead/install-ci-workflow.sh --org $GITHUB_ORG --apply-gates gate-minimums.yaml
   ```

   _Stages `ci/railhead-gates.yml`, copies `gate-minimums.yaml`, and writes `ci/distribution-plan.md`. Use `--dry-run` when you only want the bundle prepared locally._

6. **Schedule recurring runs (optional)**

   ```bash
   ./scripts/railhead/schedule-recurring.sh --org $GITHUB_ORG --cadence weekly
   ```

   _Outputs `ci/railhead-recurring.yml`, which can be pushed to the org to schedule recurring evidence refreshes._

7. **Publish evidence externally (optional)**

   ```bash
   ./scripts/railhead/publish-artifacts.sh --dest s3://railhead-evidence/${GITHUB_ORG}/latest --compress
   ```

   _Packages the latest run and syncs it to the destination bucket when the AWS CLI is available._

All scripts emit logs to `logs/railhead/<timestamp>/`. Outputs land in `artifacts/railhead/<timestamp>/`, and `artifacts/railhead/latest/manifest.json` lists every generated file with checksums.

---

## 5. Artifact Map

| Folder                                    | Contents                                                                                               | Next action                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `artifacts/railhead/<ts>/discovery/`      | `repos.csv`, `ci-workflows.json`, `environment-map.json`, `observability/endpoints.json`.              | Spot gaps (missing repos, CI jobs without tests) and open remediation tickets.     |
| `artifacts/railhead/<ts>/security/`       | `sbom.json`, `vulnerability-findings.csv`, `signing/summary.md`, `secrets/scan.csv`.                   | Escalate risky dependencies, plan signing upgrades, and rotate any leaked secrets. |
| `artifacts/railhead/<ts>/governance/`     | `risk-ledger.csv`, `risk-ledger.json`, `raci.yaml`, `dod-checklist.md`.                                | Assign accountable owners, update mitigation status, attach evidence links.        |
| `artifacts/railhead/<ts>/ci/`             | `railhead-gates.yml`, optional `gate-minimums.yaml`, `distribution-plan.md`, `railhead-recurring.yml`. | Push workflow files to target repos or attach to change-management tickets.        |
| `artifacts/railhead/<ts>/evidence-index/` | `index.csv` seeded during bootstrap.                                                                   | Append downstream evidence locations and approvals as work completes.              |

Use `artifacts/railhead/<ts>/manifest.json` to feed automation or upload the bundle to the evidence vault. For regulated engagements, run the publish helper in Step 7 to sync to your audit bucket.

---

## 6. Operational Follow-Up

1. **Remediate risks fast:** Pull `governance/risk-ledger.csv` and `security/vulnerability-findings.csv` into your tracking board, assign owners, and set SLA-driven due dates.
2. **Update Definition of Done:** Check off `governance/dod-checklist.md` as fixes land; attach links back to `evidence-index/index.csv` for traceability.
3. **Report upward:** Drop `ci/distribution-plan.md` and the manifest into leadership updates to show who is accountable for what.
4. **Keep evidence fresh:** Schedule weekly runs with `schedule-recurring.sh` (or tie to release milestones) so the artifact trail never stales.
5. **Request tailored runs:** If you need deeper tailoring (additional tooling, custom compliance mappings), send the org slug, cloud coverage, observability endpoints, and extra SCM/CI systems to the enablement team—they can extend the pack for you.

Logistics wins; evidence speaks—run the pack and move the launch checklist to green.
