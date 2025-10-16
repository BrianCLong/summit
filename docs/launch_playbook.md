# IntelGraph — Launch Playbook (Local, K8s, Cloud, Air‑Gapped)

> A step‑by‑step guide to spin up IntelGraph for a **15‑minute demo**, a **pilot on Kubernetes**, a **cloud environment via Terraform+Helm**, or an **offline/air‑gapped kit**. Use the path that matches your context; each path ends with the same smoke‑test and data seeding flow.

---

## 0) Quick Decision Tree

- **I need a local demo now (single laptop):** Go to **A. Docker Compose Quickstart**.
- **We run on k8s (dev/stage/prod):** Go to **B. Helm on Kubernetes**.
- **We want cloud infra provisioned for us:** Go to **C. Terraform + Helm**.
- **We’re disconnected/air‑gapped:** Go to **D. Offline Kit**.

---

## Prerequisites (all paths)

- **Hardware:** 8 CPUs, 16 GB RAM, 40 GB free disk (demo); scale up for pilots.
- **Accounts/Secrets:**
  - OIDC (or local) auth; demo can run with local users.
  - Optional data connectors may require keys (e.g., VirusTotal, MISP). Leave disabled for demo.

- **Ports (local demo):** 3000 (web), 8080 (GraphQL), 7687 (graph DB), 9092 (Kafka). Adjust if occupied.

---

## A) Docker Compose Quickstart (10–15 min)

**Best for:** Fast demo on a single machine with synthetic dataset _Aurora‑Phish_.

1.  **Clone and prepare environment**

```bash
# From your workspace root
export IG_ROOT=$PWD/intelgraph-main
cd "$IG_ROOT"
cp .env.demo .env        # or create .env from templates in /deploy/env/
# Generate demo JWT signing keypair (do not use in prod)
openssl genrsa -out deploy/secrets/jwt-demo.key 2048
openssl rsa -in deploy/secrets/jwt-demo.key -pubout -out deploy/secrets/jwt-demo.pub
```

2.  **Start the stack**

```bash
# Uses a curated compose file with healthchecks & demo values
docker compose -f deploy/compose/demo.yaml up -d
# Watch until all are healthy
watch -n 2 'docker compose -f deploy/compose/demo.yaml ps'
```

3.  **Bootstrap schema, policies, and seed data**

```bash
# Apply graph schema & migrations
./scripts/migrate_graph.sh   --gateway http://localhost:8080   --schema ./schemas/canonical

# Load policy package v1 into the policy engine (OPA)
./scripts/policy_load.sh   --opa http://localhost:8181   --bundle ./policies/opa/policy-v1/

# Seed synthetic case: Aurora‑Phish (entities, edges, evidence)
./scripts/seed/seed_aurora_phish.sh   --gateway http://localhost:8080   --case Aurora-Phish   --evidence ./samples/aurora_phish
```

4.  **Create demo users/roles (local auth)**

```bash
./scripts/bootstrap_users.sh   --gateway http://localhost:8080   --users ./deploy/bootstrap/users-demo.yaml
```

_Default demo roles:_ `Analyst`, `Approver`, `Ombuds`, `Admin`.

5.  **Open the app & login**

- **Web UI:** [http://localhost:3000](http://localhost:3000)
- Use the credentials created above (see `users-demo.yaml`).

6.  **Run the smoke test** (see **E. Smoke Test & First 5 Clicks**).

> **Stop/Reset**

```bash
docker compose -f deploy/compose/demo.yaml down
# Optional: reset volumes for a clean slate
./scripts/demo_reset.sh
```

---

## B) Helm on Kubernetes (dev/stage/pilot)

**Best for:** Teams standardizing on k8s. Works with **kind**, **k3d/Minikube**, or a managed cluster.

1.  **Create/target a cluster**

```bash
# kind example
kind create cluster --name intelgraph --config deploy/kind/kind-config.yaml
kubectl cluster-info
```

2.  **Namespaces & CRDs**

```bash
kubectl apply -f deploy/k8s/namespaces.yaml
kubectl apply -f deploy/k8s/crds.yaml
```

3.  **Secrets & values**

```bash
# Generate or import signing keys, connector secrets, and OIDC config
kubectl -n intelgraph create secret generic ig-secrets   --from-file=jwt.key=deploy/secrets/jwt-demo.key   --from-file=jwt.pub=deploy/secrets/jwt-demo.pub

# Prepare values file based on ./helm/values/demo.yaml
cp ./helm/values/demo.yaml ./helm/values/local.yaml
# Edit local.yaml for image tags, resources, and optional connectors
```

4.  **Install the chart**

```bash
helm upgrade --install intelgraph ./helm/intelgraph   -n intelgraph -f ./helm/values/local.yaml
kubectl -n intelgraph rollout status deploy/intelgraph-gateway --timeout=180s
```

5.  **Port‑forward or Ingress**

```bash
kubectl -n intelgraph port-forward svc/intelgraph-web 3000:80 &
```

6.  **Seed & bootstrap**

```bash
kubectl -n intelgraph apply -f deploy/k8s/jobs/seed-aurora.yaml
kubectl -n intelgraph logs job/seed-aurora -f
```

7.  **Smoke test:** open [http://localhost:3000](http://localhost:3000) and continue with **E**.

> **Uninstall**

```bash
helm -n intelgraph uninstall intelgraph
kubectl delete ns intelgraph
```

---

## C) Terraform + Helm (cloud demo/pilot)

**Best for:** One‑command cloud infra with a managed k8s, storage, and network. Modules assume a cloud provider account and Terraform 1.6+.

1.  **Prepare environment variables** (provider creds) and select an environment folder, e.g. `terraform/envs/demo`.

```bash
cd terraform/envs/demo
auth envs set # provider‑specific
terraform init
```

2.  **Apply infra**

```bash
terraform apply -var-file=demo.tfvars
```

Outputs include: `cluster_name`, `base_url`, `issuer_url`, and **Helm release** hooks.

3.  **Seed and users**
    Run the post‑apply script (invoked by module output) or execute the seeding job as in **B.6** against the new cluster.

4.  **Ingress & DNS**
    Point a DNS record to the provisioned Load Balancer/Ingress IP; TLS is optionally provisioned via cert‑manager.

> **Destroy (demo)**

```bash
terraform destroy -var-file=demo.tfvars
```

---

## D) Offline/Air‑Gapped Kit

**Best for:** No external connectivity. Uses signed tarballs and an internal registry.

1.  **Import bundle** (from `offline/`):

```bash
sudo ./offline/install.sh --bundle ./offline/intelgraph_offline_bundle.tgz
```

2.  **Load images to local registry**

```bash
./offline/load_images.sh --registry localhost:5000
```

3.  **Deploy via Helm (air‑gapped values)**

```bash
helm upgrade --install intelgraph ./helm/intelgraph   -n intelgraph -f ./helm/values/airgapped.yaml
```

4.  **Seed synthetic data** via offline job manifest:

```bash
kubectl -n intelgraph apply -f offline/jobs/seed-aurora-offline.yaml
```

---

## E) Smoke Test & First 5 Clicks (all paths)

1.  **Login →** `Cases → Aurora‑Phish` (status: _Open_).
2.  **Run** saved query: `Policy‑Aware Shortest Path` → observe denial/approval prompt.
3.  **Open** `ER Explain` on an entity → review merge features/weights.
4.  **Run** Copilot prompt: "Summarize likely cluster membership and cite evidence." → check citations.
5.  **Export** `Disclosure Bundle` → click **Verify Externally** and confirm a green result.

---

## F) Configuration Notes

- **Auth:** For demo, local users suffice. For pilots, configure OIDC (issuer, client ID/secret) in Helm values.
- **Connectors:** Optional keys in `values.*.yaml` or `.env`; keep disabled for demo to avoid egress.
- **Data & Policy:** Start with `policy-v1` (deny by default); simulate changes in **Policy Simulator** before enabling.
- **Resources:** Demo footprints are conservative; increase CPU/memory for analytics jobs in pilot.

---

## G) Troubleshooting Quick Hits

- **Web 502/blank:** Gateway not ready; `kubectl get pods -n intelgraph` or `docker compose ps` for health.
- **Login fails (OIDC):** Check clock skew, redirect URI, and client secrets.
- **Seeding errors:** Verify GraphQL gateway URL and that migrations completed.
- **Policy blocks export unexpectedly:** Open **License/TOS** pane → review clause, use **appeal path** if appropriate.
- **High latency:** Check SLO dashboard; reduce query depth or enable sampled results.

---

## H) Stop, Reset, Upgrade

- **Stop local demo:** `docker compose down`.
- **Reset demo data:** `./scripts/demo_reset.sh`.
- **Upgrade on k8s:** `helm upgrade --install ...` with a new image tag; jobs are idempotent.

---

## I) Security & Compliance Reminders

- Use demo keys only for demos; rotate secrets on pilot.
- Keep optional connectors off unless license/authority is confirmed.
- Ensure data minimization and purpose limitation labels are applied at ingest.

---

## J) Next Steps (Pilot)

- Confirm **owner**, **datasets**, and **success metrics**.
- Run the 15‑minute demo (scripts provided) with stakeholders.
- Capture metrics: TTFI, false‑positive rate, p95 latency, disclosure verification pass rate.
