# Maestro Conductor Build & Orchestration Guide

This guide enables platform engineers, release captains, and SREs to operate Maestro Conductor—the control plane for Summit builds, deployments, and governance. It covers environment bootstrapping, Helm-driven releases, and ArgoCD progressive delivery while ensuring parity with the React front end (`client/`, `client/src/features/conductor`) and the Node.js services that power IntelGraph (`server/src/maestro`, `apps/intelgraph-api`).

> **Audience**: Platform engineers, DevOps leads, and automation specialists managing Summit deployments with Maestro Conductor.

---

## 1. Platform Overview

Maestro Conductor provides:

- **Build Plane**: CI artifacts promoted through signed container registries.
- **Deploy Plane**: Kubernetes cluster blueprints, Helm release orchestration, and compliance gates.
- **Governance Plane**: Policy enforcement, drift detection, and audit trails aligned with Summit security standards.

### Core Components

| Component | Description |
| --- | --- |
| `maestro-api` | Node.js orchestrator implemented under `server/src/maestro`. Exposes REST hooks for build promotion and cluster reconciliation. |
| `maestro-ui` | React admin console driven by `client/src/features/conductor` that surfaces release health, GitOps status, and compliance posture. |
| `argo-cd` | Declarative GitOps engine deployed in the control namespace. Helm manifests live in `helm/conductor` and `helm/intelgraph/templates/rollout.yaml`. |
| `helmfile-runner` | Worker responsible for executing Helm/Helmfile bundles from `helm/` and templating environment overrides defined in `infra/terraform`. |
| `policy-engine` | OPA/Rego guardrails stored in `policies/opa` that gate images, Helm values, and Kubernetes manifests. |

---

## 2. Prerequisites & Environment Bootstrap

1. **Clone Infrastructure Repos**: Ensure you have access to `infra/`, `helm/`, and `policies/` within the Summit monorepo. Run `git submodule update --init --recursive` if any environment packs are referenced as submodules.
2. **Install CLIs**:
   - `kubectl >= 1.29`
   - `helm >= 3.14`
   - `argocd` CLI for live diffing
   - `just` (optional) to run the provided Conductor tasks (see `Justfile`)
3. **Authenticate**:
   - Kubernetes: `aws eks update-kubeconfig --name summit-control` (or equivalent cloud command).
   - Container registry: `az acr login`, `gcloud auth configure-docker`, or `aws ecr get-login-password` depending on environment.
4. **Sync Secrets**: Copy `.env.example` files (root and `server/`) to `.env` and fill in organization credentials. Maestro expects ArgoCD, Slack, and SSO tokens to be provided before workloads start.
5. **Verify Compatibility**:
   - The React Maestro UI uses the same Node.js GraphQL schema extensions consumed by IntelGraph. Run `pnpm lint` and `pnpm typecheck` from the repo root before promoting UI updates.
   - Ensure the API version served by `maestro-api` matches the Helm chart `appVersion` in `helm/conductor/Chart.yaml`. Check via `kubectl get deploy maestro-api -o jsonpath='{.spec.template.metadata.labels.version}'` and reconcile with the value in `helm/conductor/values.yaml`.
   - Run `just conductor-status` to confirm `/healthz` and `/graphql` respond locally before shipping new automation.

---

## 3. Tutorial: Provisioning a New Kubernetes Environment

1. **Select Blueprint**: In Maestro UI, navigate to **Environments → Create** and choose a blueprint (e.g., `summit-prod-multi-az`). Blueprint manifests live under `infra/terraform` (for infrastructure) and `infra/k8s` (for cluster add-ons).
2. **Parameterize**: Supply cluster size, node pools, and network CIDR. Maestro validates values using the Rego policies in `policies/opa/`.
3. **Generate Plan**: Click **Generate**. Maestro renders Terraform/Helm previews and attaches them to the request ticket.
4. **Review Plan**: Use the UI diff viewer or run `terraform -chdir=infra/terraform/<env>` `plan` locally to inspect YAML/TF diffs before approval.
5. **Approve**: Submit for approval. Approvers receive Slack notifications through `ops/alerting`. Policy engine ensures RBAC coverage.
6. **Apply**: Once approved, Maestro triggers the build plane to provision infrastructure. Track progress via the event stream and `kubectl get events -n maestro-system`.
7. **Validate**: After apply, run post-flight checks: `kubectl get nodes`, `kubectl get pods -n maestro-system`, confirm IntelGraph namespaces from `infra/k8s/namespaces` exist, and run `just conductor-status` for API health.

### Troubleshooting

| Issue | Resolution |
| --- | --- |
| Blueprint validation fails | Inspect policy logs in the `policy-engine` pod (`kubectl logs deploy/policy-engine`). Update variable schemas in `infra/terraform/modules/<module>/variables.tf`. |
| Terraform apply stuck | Check work queue in `maestro-worker` via `kubectl logs deployment/maestro-worker`. If a job is wedged, restart it with `kubectl rollout restart deployment/maestro-worker` after confirming no tasks are mid-flight. |
| IntelGraph namespace missing | Apply the namespace definitions from `infra/k8s/namespaces` (`kubectl apply -f infra/k8s/namespaces/intelgraph.yaml`) or rerun `helm upgrade --install intelgraph helm/intelgraph --namespace intelgraph`. |

---

## 4. Tutorial: Managing Helm Releases

1. **Review Release Channel**: Open **Helm Releases → IntelGraph** to view channels (dev, staging, prod). Channels map to Git branches and values overlays in `helm/intelgraph/values*.yaml`.
2. **Diff Values**: Select the target release and click **Diff**. Maestro runs a Helm diff against the manifests under `helm/intelgraph/templates`.
3. **Run Smoke Tests**: Execute `just conductor-smoke` or the K6 scripts in `scripts/k6/` to validate API health before deployment. Results stream to the Maestro UI and persist in PostgreSQL.
4. **Promote Container Images**: Approve image promotion from the build plane. This updates the Helm values file with the new image tag.
5. **Execute Deploy**: Click **Deploy** or run:

   ```bash
   helm upgrade --install intelgraph helm/intelgraph \
     --namespace intelgraph --create-namespace \
     --values helm/intelgraph/values.yaml --values helm/intelgraph/values-ga.yaml
   ```

   Maestro records the deployment event and calls ArgoCD sync hooks.
6. **Validate**: Post-deploy, run `kubectl get pods -n intelgraph`, `kubectl rollout status deployment/intelgraph-api -n intelgraph`, and `just conductor-status` to ensure the Node.js APIs and React front end respond.

### Rollbacks

- Use **Revisions → Rollback** to redeploy a previous Helm release. Maestro captures Helm revision IDs and stored values.
- For partial rollbacks (UI only), update the React artifact reference while leaving backend unchanged. Ensure compatibility matrix is satisfied.

### Troubleshooting

- **Helm Diff Errors**: Check `helmfile` render logs. Validate Chart.yaml version constraints.
- **Failed Hooks**: Inspect the Kubernetes jobs spawned by Helm hooks (`kubectl logs job/conductor-observability`), which are defined in `helm/conductor-observability-patch.yaml`.
- **React asset 404s**: Confirm the CDN bucket sync completed. Rebuild the UI with `pnpm -C client build` before re-promoting assets.

---

## 5. Tutorial: ArgoCD Progressive Delivery

1. **Access Pipelines**: From Maestro UI, go to **GitOps → Pipelines**. Each pipeline corresponds to an ArgoCD ApplicationSet.
2. **Health Check**: Review the pipeline health widget. Status and sync history come directly from ArgoCD `/api/v1/applications`.
3. **Progressive Waves**: Configure waves (canary, baseline, full rollout). Maestro maps your selections into the rollout values consumed by `helm/intelgraph/templates/rollout.yaml`.
4. **Start Rollout**: Click **Start Progressive Delivery**. Maestro updates Argo Rollouts CRDs and monitors analysis runs.
5. **Observe Metrics**: Connect Prometheus & Grafana dashboards via the embedded iframe. Ensure IntelGraph service-level objectives remain green.
6. **Promote to Steady State**: Once analysis passes, finalize the rollout. Maestro updates Helm values to mark the release as stable.
7. **Audit**: Export the pipeline timeline for compliance. Reports are written through the provenance ledger in `server/src/maestro/provenance/merkle-ledger.ts`; use `pnpm maestro:report` to retrieve signed snapshots.

### Troubleshooting

| Symptom | Action |
| --- | --- |
| Analysis run failed | Inspect `argo rollouts get rollout <name> --watch`. Adjust success conditions in `helm/intelgraph/templates/rollout.yaml` or associated AnalysisTemplates. |
| Sync blocked by policy | Review OPA decision logs (`kubectl logs deploy/policy-engine`). Waive or update the relevant rule in `policies/opa`. |
| React UI stale after rollout | Clear CDN cache or rerun `pnpm -C client build` and update the asset tag in `helm/intelgraph/values.yaml`. Ensure the Node backend version flag toggled to the new release. |

---

## 6. Governance & Compliance Tips

- Enable **Drift Detection**: Toggle in Maestro UI to schedule hourly audits. Non-compliant resources trigger Jira tickets automatically.
- Integrate **Security Scans**: Attach Trivy or Grype reports to build artifacts. Fail the pipeline if vulnerabilities exceed thresholds defined in `policies/opa/deploy-gate.rego`.
- Capture **Change Records**: Use the Change Calendar integration to log scheduled deployments.
- Maintain **Runbooks**: Link to [`docs/OPERATIONS-RUNBOOK.md`](../OPERATIONS-RUNBOOK.md) and [`docs/MAESTRO_GO_LIVE_READINESS_AND_CUTOVER.md`](../MAESTRO_GO_LIVE_READINESS_AND_CUTOVER.md) for deeper operational guidance.

---

## 7. Support & Escalation

- **Level 1**: Check Maestro UI notifications, run `just conductor-status`, and review ArgoCD dashboards.
- **Level 2**: Inspect `maestro-api` and `maestro-worker` pod logs via `kubectl logs deployment/maestro-api` and `kubectl logs deployment/maestro-worker`.
- **Level 3**: Engage the Summit platform guild. Provide deployment ID, Helm revision, and ArgoCD application names captured in `helm history intelgraph -n intelgraph`.
- **Emergency Rollback**: Abort an Argo rollout with `argo rollouts abort intelgraph -n intelgraph` or revert the Helm release with `helm rollback intelgraph <revision> -n intelgraph`.

For integration questions between IntelGraph and Maestro Conductor, coordinate with the cross-functional tiger team or file an issue tagged `infra/maestro`.

