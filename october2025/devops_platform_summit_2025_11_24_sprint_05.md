# Ops & Delivery Orchestrator — Workstream Plan (Sprint 05)

**Slug:** `devops-platform-summit-2025-11-24-sprint-05`  
**Dates:** 2025‑11‑24 → 2025‑12‑05 (2 weeks)  
**Role:** DevOps / CI‑CD / Deployment / Repo Arborist / Merge & Release Captain  
**Environments:** dev → stage → prod; multi‑region (us‑east/us‑west); dual edge (Cloudflare + CloudFront)

**Mission:** Deliver **confidential computing for PII services**, a **fraud/bot signal pipeline**, and **self‑healing runbooks** (auto‑remediation for top incidents). Add **data‑in‑use encryption** via Vault Transit, tighten **runtime attestation**, and wire **adaptive load‑shedding** to protect SLOs under abuse or partial outages.

---

## 0) Context Snapshot (post Sprint 04)

- Privacy: tokenization at edge, OPA retention gates, DLP at ingress + CI.
- Resilience: cross‑cloud edge drill passed (60s failover).
- Scaling: KEDA SLO‑driven autoscaling live.
- Schema: migration catalog + gates operational.

> In Sprint 05 we harden compute trust (attestation + enclaves), build a first‑class fraud signal bus, and close the loop with auto‑mitigation.

---

## 1) Sprint Goal

1. **Attested runtime** for sensitive services (Nitro Enclaves) with signed evidence in release audits.
2. **Fraud signal bus** (bot score + behavior) feeding WAF rules and rate‑limits.
3. **Self‑healing** auto‑remediation for 3 ranked incident classes with human‑in‑the‑loop safety.
4. **Data‑in‑use encryption** for hot PII fields via Vault Transit (envelope), with rotation & backfill jobs.

**Definition of Success:**

- Production `pii‑svc` serves via enclave‑backed pods; attestation verified in CI/CD + on boot.
- Fraud pipeline tags > 90% of scripted abuse in stage drills; WAF reacts automatically.
- Auto‑remediation resolves targeted incidents in < 5 min median without human touch (with audit trail).
- Field encryption live for selected columns; rotation executed successfully.

---

## 2) Scope (In/Out)

**In**

- SPIFFE/SPIRE identities → mTLS for service mesh; enclave attestation claims → policy.
- Nitro Enclaves (AWS) template with vsock proxy for KMS/Vault; sidecar verifier.
- Fraud signal bus (Kafka/Redpanda) + lightweight feature extractor; WAF webhook integration.
- Auto‑remediation controller (Argo Events + Workflows or Actions Runner Controller) with guardrails.
- Vault Transit for FLE (field‑level encryption) + rotation jobs; backfill tooling.

**Out (this sprint)**

- Full privacy‑preserving analytics stack; advanced fraud ML (placeholders + hooks only).

---

## 3) Deliverables (Merge‑ready Artifacts)

### 3.1 Runtime Identity & Attestation (SPIFFE/SPIRE + Enclave)

```yaml
# infra/k8s/spire/server.yaml (baseline server)
apiVersion: spire.spiffe.io/v1alpha1
kind: Server
metadata: { name: spire-server, namespace: spire }
spec:
  server:
    trustDomain: example.internal
    dataStore:
      {
        sql:
          {
            driverName: sqlite3,
            fileName: '/run/spire/data/datastore.sqlite3',
          },
      }
  telemetry: { enablePrometheus: true }
```

```yaml
# infra/k8s/spire/registration.yaml
apiVersion: spire.spiffe.io/v1alpha1
kind: Entry
metadata: { name: pii-svc-entry, namespace: spire }
spec:
  spiffeID: spiffe://example.internal/ns/pii/sa/pii-svc
  parentID: spiffe://example.internal/ns/kube-system/sa/spire-agent
  selectors:
    - type: k8s
      value: ns:pii
    - type: k8s
      value: sa:pii-svc
```

```yaml
# infra/k8s/pii-svc/deployment-enclave.yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: pii-svc, namespace: pii }
spec:
  replicas: 3
  selector: { matchLabels: { app: pii-svc } }
  template:
    metadata:
      labels: { app: pii-svc }
    spec:
      runtimeClassName: kata # if using kata-containers; optional if enclave is external
      containers:
        - name: app
          image: ghcr.io/org/pii-svc:${VERSION}
          env:
            - { name: VAULT_ADDR, value: https://vault.svc.cluster.local }
            - {
                name: SPIFFE_ENDPOINT_SOCKET,
                value: unix:///run/spiffe/api.sock,
              }
          volumeMounts:
            - { name: spiffe, mountPath: /run/spiffe }
        - name: attestor
          image: ghcr.io/org/enclave-attestor:latest
          args:
            [
              '--verify-nitro',
              '--require-claims',
              'pcrs:sha384',
              'image:${VERSION}',
            ]
      volumes:
        - name: spiffe
          csi: { driver: spiffe.csi.spiffe.io }
```

```yaml
# policy/opa/attestation.rego
package attestation

default allow = false
allow {
input.kind == "DeployRequest"
input.service == "pii-svc"
input.attestation.nitro == true
input.attestation.measurement == input.expected_measurement
input.actor.assurance == "webauthn"
}
```

### 3.2 CI/CD — Attestation in Release Train

```yaml
# .github/workflows/release-train.yml (attestation step additions)
verify_attestation:
  needs: cut
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Verify Sigstore provenance
      run: cosign verify $IMAGE --certificate-oidc-issuer https://token.actions.githubusercontent.com
    - name: Verify enclave measurement
      run: ./ci/attest/verify_nitro.sh --expected $MEAS --image $IMAGE
    - name: Gate via OPA
      run: conftest test --policy policy/opa ci/attest/context.json
```

### 3.3 Vault Transit — Field‑Level Encryption (FLE)

```hcl
# infra/vault/transit.hcl (Terraform)
resource "vault_mount" "transit" { path = "transit" type = "transit" }
resource "vault_transit_secret_backend_key" "pii" {
  backend = vault_mount.transit.path
  name    = "pii"
  type    = "aes256-gcm96"
  exportable = false
  allow_plaintext_backup = false
  min_decryption_version = 1
  deletion_allowed = true
}
```

```bash
# services/pii-svc/crypto/transit.sh
vault write -format=json transit/encrypt/pii plaintext=$(echo -n "$PLAINTEXT" | base64) | jq -r .data.ciphertext
vault write -format=json transit/decrypt/pii ciphertext="$CIPHERTEXT" | jq -r .data.plaintext | base64 -d
```

```sql
-- db/migrations/2025-11-25-001-add-encrypted-columns.sql
ALTER TABLE users ADD COLUMN email_enc text;
UPDATE users SET email_enc = encrypt_vault(email::text);
ALTER TABLE users DROP COLUMN email;
```

```yaml
# .github/workflows/fle-backfill.yml
name: FLE Backfill
on: { workflow_dispatch: {} }
jobs:
  backfill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backfill job
        run: ./db/tools/fle_backfill.sh --table users --column email --key pii
```

### 3.4 Fraud Signal Bus

```yaml
# infra/k8s/fraud/kafka.yaml (or Redpanda)
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata: { name: fraud-bus, namespace: fraud }
spec:
  kafka:
    replicas: 3
    listeners: { plain: {}, tls: {} }
  zookeeper: { replicas: 3 }
```

```yaml
# services/fraud-signal/deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: fraud-signal, namespace: fraud }
spec:
  replicas: 2
  selector: { matchLabels: { app: fraud-signal } }
  template:
    metadata: { labels: { app: fraud-signal } }
    spec:
      containers:
        - name: extractor
          image: ghcr.io/org/fraud-extractor:latest
          env:
            - { name: INPUT_TOPIC, value: gateway-logs }
            - { name: OUTPUT_TOPIC, value: fraud-signals }
```

```yaml
# infra/edge/waf-integration.yml
apiVersion: batch/v1
kind: CronJob
metadata: { name: waf-sync, namespace: edge }
spec:
  schedule: '*/5 * * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: sync
              image: ghcr.io/org/waf-sync:latest
              args: ['--from-topic', 'fraud-signals', '--apply']
          restartPolicy: OnFailure
```

### 3.5 Self‑Healing — Auto‑Remediation Controller

```yaml
# .github/workflows/auto-remediate.yml
name: Auto‑Remediate (top incidents)
on:
  repository_dispatch:
    types: [incident.trigger]
permissions: { contents: read, pull-requests: write }
jobs:
  remediate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Parse incident
        run: ./runbooks/auto/route.sh "$PAYLOAD" > plan.json
      - name: Human-in-the-loop approval (critical only)
        if: contains(steps.plan.outputs.severity, 'critical')
        uses: trstringer/manual-approval@v1
        with: { reviewers: team:sre }
      - name: Execute action
        run: ./runbooks/auto/exec.sh plan.json
      - name: Post evidence
        run: ./runbooks/auto/evidence.sh plan.json
```

```md
# runbooks/auto/catalog.md

- **Incident A:** Ingest backlog > 10k msgs → Action: scale consumers + purge DLQ older than 24h.
- **Incident B:** Gateway p95>1.8s, err>2% → Action: enable load‑shedding + bump replicas + lower cache TTL.
- **Incident C:** AuthZ drift detected → Action: apply OPA policy rollback to last known‑good bundle.
```

```yaml
# infra/k8s/gateway/loadshed-config.yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: loadshed-config, namespace: gateway }
data:
  mode: 'adaptive'
  shed_threshold_ms: '1500'
  max_drop_percent: '30'
```

### 3.6 eBPF Observability Hooks (optional but valuable)

```yaml
# infra/k8s/observability/cilium-hubble.yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata: { name: observe-gateway }
spec:
  endpointSelector: { matchLabels: { app: gateway } }
  ingress:
    - fromEntities: [all]
      toPorts:
        - ports: [{ port: '443', protocol: TCP }]
          rules:
            http: [{ method: GET, path: '/' }]
```

---

## 4) Sprint Backlog

### Epic T — Confidential Compute & Attestation

- **T1**: SPIFFE/SPIRE rollout + identity for `pii‑svc`.
- **T2**: Enclave attestation verify in CI + startup.
- **T3**: OPA policy gate; reason‑for‑access at prod deploy.

**Acceptance:** Deploy blocked without valid attestation; evidence attached in release.

### Epic U — Data‑in‑Use Encryption

- **U1**: Vault Transit backend + SDK integration.
- **U2**: Backfill/rotation tool; migrate `users.email` → `email_enc`.
- **U3**: Perf test overhead (<5% p95 hit) with cache.

**Acceptance:** Encrypted columns live; rotation succeeds; perf impact within budget.

### Epic V — Fraud Signals & Edge Actions

- **V1**: Kafka/Redpanda topic + extractor service.
- **V2**: WAF sync job translates signals to rules/allow‑blocks.
- **V3**: Drill blocks scripted abuse (>90% precision on seeded bots).

**Acceptance:** Attack simulation blocked at edge; false positive rate < 2%.

### Epic W — Self‑Healing

- **W1**: Incident router + action catalog.
- **W2**: GitHub Action workflow + evidence bundle.
- **W3**: Guardrails (caps, cooldowns, approval for criticals).

**Acceptance:** 3 incident classes auto‑resolved in stage < 5 min; artifacts stored.

---

## 5) Day‑by‑Day Cadence

- **D1**: SPIFFE/SPIRE + identities; enclave deploy scaffolding.
- **D2**: CI attestation verify; OPA deploy gate; stage rollout.
- **D3**: Vault Transit enablement; FLE SDK; small backfill test.
- **D4**: Full backfill + rotation rehearsal; perf test & caching.
- **D5**: Fraud bus + extractor; WAF sync; abuse drill.
- **D6**: Auto‑remediation workflows; incident router; load‑shedding config.
- **D7**: Evidence capture, runbook polish, soak & ship.

---

## 6) Acceptance Evidence to Capture

- SPIFFE entries, attestation verifier logs, OPA decisions; Vault key versions & rotate logs; migration diffs; perf test outputs; Kafka topics and consumer lag; WAF rule diffs + blocked request samples; incident timelines; load‑shedding graphs.

---

## 7) Risks & Mitigations

- **Enclave integration complexity** → start with one service; blue/green swap; clear fallback path.
- **Perf overhead of FLE** → cache ciphertext envelopes; batch decrypt; use async re‑encrypt on rotate.
- **Edge false blocks** → shadow‑mode WAF rules then enforce; maintain allowlist.
- **Auto‑remediation misfire** → hard caps, dry‑run mode, approvals for criticals, full audit.

---

## 8) Alignment

- _UNIFIED DATA FOUNDATION_: encryption + catalog compatible; fraud signals inform data quality checks.
- _TRIAD MERGE_: attested runtime lowers risk of rapid merges; self‑healing stabilizes SLOs.
- _MAESTRO COMPOSER_: protected UX under bot/abuse and during incidents.

---

## 9) Runbooks

```md
# RUNBOOK: Enclave Rollout

1. Bake enclave image; record measurement.
2. Deploy to stage with attestor sidecar; verify claims.
3. Canary 10→100%; monitor p95/err; rollback on breach or attestation failure.
```

```md
# RUNBOOK: FLE Backfill & Rotate

- Dry run with 1% sample; verify decrypt.
- Run backfill; monitor lag; reindex as needed.
- Rotate key version; re‑encrypt envelopes asynchronously.
```

```md
# RUNBOOK: Abuse Drill

- Start traffic generator (bots + humans).
- Verify fraud extractor emits signals; WAF sync blocks abusive IPs/JWTs.
- Confirm customer traffic SLOs unaffected.
```

---

## 10) Quick‑Start Commands

```bash
# Verify enclave measurement
./ci/attest/verify_nitro.sh --expected $MEAS --image $IMAGE

# Encrypt/decrypt with Vault Transit
PLAINTEXT="user@example.com" ./services/pii-svc/crypto/transit.sh

# Trigger auto‑remediation (stage)
curl -X POST $INCIDENT_WEBHOOK -d '{"type":"ingest_backlog","severity":"high"}'
```

---

## 11) Follow‑on Seeds (Sprint 06)

- Privacy‑preserving analytics (HE/TEE aggregation).
- Adaptive autoscaling tied to **error budget burn rate windows** + queue depth.
- Policy‑guarded ephemeral data access with short‑lived, reason‑bound credentials.
- Multi‑writer data plane with write fencing and consistency monitors.
