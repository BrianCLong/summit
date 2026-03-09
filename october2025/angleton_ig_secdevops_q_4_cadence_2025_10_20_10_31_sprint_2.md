# Angleton IG — SecDevOps Workstream (Sprint 2)

**Cadence:** Oct 20–31, 2025 (Sprint 2 of Q4)  
**Alignment:** Continues company OS cadence; builds on Sprint 1 outcomes  
**Role:** Security • DevSecOps • Counterintelligence  
**Prime Directive:** Protect people, data, funds, infrastructure, brand.

---

## 1) Objectives & Definition of Done (DoD)

**Objective:** Move from “verifiable builds” → **“verified deploys & runtime”**. Enforce signed, SBOM‑backed artifacts at deploy, harden cluster runtime, expand OPA to ABAC, add DLP/secret controls, and stand up dashboards with tamper‑evident logs. Ship e2e checks (WebAuthn step‑up smoke, perf, and basic license compliance).

**DoD:**

- Deploys blocked unless: `cosign.verify=pass ∧ sbom.present ∧ provenance.verified ∧ images.pinnedByDigest ∧ policies.pass`.
- Kubernetes workloads run with `NetworkPolicy`, `readOnlyRootFilesystem`, `runAsNonRoot`, `PDB/HPA present`, and signed images only.
- OPA policies cover action/resource ABAC and emit decision logs; dashboards show CI → Gate → Deploy lineage.
- DLP/secret scans clean on PRs and release tags.

---

## 2) Backlog (ranked)

### P0 — Must land

1. **Deploy‑time Signature & Provenance Verify**: ArgoCD/Admission policy enforcing cosign‑verified, digest‑pinned images (keyless, Fulcio/Rekor).
2. **ABAC Policy Expansion**: Extend OPA (`switchboard`) with action/resource schema + org roles; add deny‑reasons and coverage tests.
3. **Cluster Runtime Hardening**: Baseline `NetworkPolicy`, `PodSecurity`, `PDB/HPA`, `securityContext` and `readOnlyRootFilesystem` for Switchboard services.
4. **Tamper‑evident CI Logs & Decision Trails**: Hash and store CI/OPA decision logs with attestations; link run → artifact → deploy.

### P1 — Strongly desired

5. **DLP/Secret Controls**: Pre‑commit + CI using `gitleaks`; redact logs on upload.
6. **Perf Baseline**: k6 smoke (RPS, p95); budget wired into CI.
7. **WebAuthn Step‑up e2e Smoke**: Playwright flow asserting step‑up required for sensitive actions.

### P2 — Stretch

8. **License Compliance Gate**: CycloneDX license rules; fail on forbidden licenses.
9. **Counter‑influence Anomaly Scan**: Advisory bot for PR/ticket coordination anomalies (non‑blocking alerts).

---

## 3) Patch Set (ready‑to‑apply)

> Minimal, reversible diffs. Adjust paths/org as needed.

### 3.1 ArgoCD / Admission: verify signatures & pin digests

**NEW (Kyverno policy):** `deploy/policies/kyverno-verify-signature.yaml`

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-and-digest-pinned
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: verify-image-signature
      match:
        {
          any:
            [
              {
                resources:
                  {
                    kinds:
                      [
                        'Deployment',
                        'StatefulSet',
                        'DaemonSet',
                        'Job',
                        'CronJob',
                      ],
                  },
              },
            ],
        }
      verifyImages:
        - imageReferences: ['ghcr.io/companyos/*']
          attestations:
            - type: cosign.sigstore.dev/attestation
          mutateDigest: false
          verifyDigest: true
          subject:
            - attestors:
                - entries:
                    - keyless:
                        issuer: 'https://token.actions.githubusercontent.com'
                        subject: 'repo:companyos/*:ref:refs/heads/main'
```

**NEW (ArgoCD image policy via OPA Gatekeeper alternative):** `deploy/policies/gatekeeper-image-digest.yaml`

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: only-ghcr-companyos
spec:
  match:
    { kinds: [{ apiGroups: ['apps'], kinds: ['Deployment', 'StatefulSet'] }] }
  parameters:
    repos: ['ghcr.io/companyos/']
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-image-digest
spec:
  match:
    { kinds: [{ apiGroups: ['apps'], kinds: ['Deployment', 'StatefulSet'] }] }
  parameters:
    labels: [{ key: 'imageDigest', allowedRegex: '^sha256:[a-f0-9]{64}$' }]
```

**NEW (ArgoCD app project policy snippet):** `deploy/argocd/projects/switchboard-project.yaml`

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: switchboard
spec:
  sourceRepos: ['https://github.com/companyos/*']
  destinations:
    [{ server: 'https://kubernetes.default.svc', namespace: 'switchboard' }]
  signatureKeys:
    - keyID: 'https://token.actions.githubusercontent.com'
  clusterResourceWhitelist: [{ group: '*', kind: '*' }]
```

### 3.2 CI: verify on deploy, hash logs, produce lineage

**NEW:** `.github/workflows/deploy.verify.yml`

```yaml
name: deploy.verify
on:
  workflow_dispatch:
  push:
    tags: ['app/switchboard-v*.*.*']
permissions:
  contents: read
  id-token: write
jobs:
  verify-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with: { name: switchboard-ci-artifacts, path: . }
      - name: Install cosign
        uses: sigstore/cosign-installer@v3
      - name: Verify image and attestations (keyless)
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          IMAGE="ghcr.io/companyos/switchboard@${{ inputs.digest || env.DIGEST }}"
          cosign verify --certificate-identity "repo:companyos/switchboard:ref:refs/heads/main" \
            --certificate-oidc-issuer "https://token.actions.githubusercontent.com" $IMAGE
          cosign verify-attestation --type cyclonedx $IMAGE
      - name: Hash logs & decision trail
        run: |
          sha256sum sbom.json > sbom.sha256
          echo "${{ github.run_id }}" | sha256sum > run.sha256
          jq -n '{run: $GITHUB_RUN_ID|tostring, sbom: input}' sbom.json > lineage.json
      - uses: actions/upload-artifact@v4
        with: { name: deploy-lineage, path: "*.sha256\nlineage.json" }
      - name: ArgoCD sync
        uses: clowdhaus/argo-cd-action@v2
        with:
          address: ${{ secrets.ARGOCD_ADDR }}
          token: ${{ secrets.ARGOCD_TOKEN }}
          appName: switchboard
          action: sync
```

### 3.3 OPA ABAC expansion + tests

**Edit:** `policies/switchboard.rego`

```rego
package switchboard
import future.keywords.in
import data.labels

# Role mapping (could be externalized later)
roles := {"viewer": 0, "agent": 1, "supervisor": 2, "admin": 3}

# Action → required role
required_role := {
  "render_widget": "viewer",
  "dispatch_action": "agent",
  "view_roster": "agent",
  "escalate_case": "supervisor",
  "manage_policy": "admin"
}

default allow = false

allow {
  input.subject.authenticated
  input.subject.webauthn_verified
  # ABAC: subject role must meet action requirement
  required_role[input.action] in roles
  roles[input.subject.role] >= roles[required_role[input.action]]
  # Resource scoping
  input.resource.namespace == input.subject.tenant
  # Data labels bound
  input.context.classification <= labels.allow_max
}

deny[msg] {
  not allow
  msg := {
    "reason": "policy_denied",
    "action": input.action,
    "neededRole": required_role[input.action],
    "hadRole": input.subject.role
  }
}
```

**Tests:** `policies/switchboard_abac_test.rego`

```rego
package switchboard

test_escalate_requires_supervisor {
  not allow with input as {
    "subject": {"authenticated": true, "webauthn_verified": true, "role": "agent", "tenant": "t1"},
    "action": "escalate_case",
    "resource": {"namespace": "t1"},
    "context": {"classification": 1}
  }
}

test_admin_can_manage_policy {
  allow with input as {
    "subject": {"authenticated": true, "webauthn_verified": true, "role": "admin", "tenant": "t1"},
    "action": "manage_policy",
    "resource": {"namespace": "t1"},
    "context": {"classification": 0}
  }
}
```

### 3.4 K8s runtime baseline (Helm overlay examples)

**NEW:** `deploy/helm/switchboard/overlays/security.yaml`

```yaml
podSecurityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
containerSecurityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ['ALL']
resources:
  requests: { cpu: '100m', memory: '128Mi' }
  limits: { cpu: '500m', memory: '512Mi' }
networkPolicy:
  enabled: true
  ingress:
    - from:
        - podSelector: { matchLabels: { app: 'gateway' } }
      ports: [{ port: 8080 }]
pdb:
  enabled: true
  minAvailable: 1
hpa:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 70
```

### 3.5 DLP/Secret controls (pre‑commit & CI)

**NEW:** `.gitleaks.toml`

```toml
title = "CompanyOS DLP"
[allowlist]
  description = "Common test fixtures"
  paths = ["testdata/", "**/*.snap"]
[rule]
  description = "Generic API Key"
  id = "generic-api-key"
  regex = '''(?i)api[_-]?key\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}'''
```

**NEW:** `.github/workflows/dlp.scan.yml`

```yaml
name: dlp.scan
on: [pull_request, push]
permissions: { contents: read }
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env: { GITLEAKS_CONFIG: .gitleaks.toml }
```

### 3.6 Perf baseline (k6) + budget gate

**NEW:** `tests/k6/smoke.js`

```js
import http from 'k6/http';
import { sleep, check } from 'k6';
export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400'],
  },
};
export default function () {
  const res = http.get(`${__ENV.BASE_URL}/health`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

**NEW:** `.github/workflows/perf.k6.yml`

```yaml
name: perf.k6
on: [workflow_dispatch]
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: k6 run tests/k6/smoke.js
        env: { BASE_URL: ${{ secrets.STAGING_URL }} }
```

### 3.7 WebAuthn step‑up smoke (Playwright)

**NEW:** `apps/web/e2e/stepup.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('step-up required for manage_policy', async ({ page }) => {
  await page.goto(process.env.BASE_URL!);
  await page.click('text=Login');
  await page.fill('#username', 'demo');
  await page.fill('#password', 'demo');
  await page.click('text=Continue');
  // Expect step-up prompt before sensitive action
  await page.click('text=Manage Policy');
  await expect(page.getByText('Use your security key')).toBeVisible();
});
```

**NEW:** `.github/workflows/e2e.playwright.yml`

```yaml
name: e2e.playwright
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: corepack enable && pnpm i --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm -w exec playwright test apps/web/e2e/stepup.spec.ts
        env: { BASE_URL: ${{ secrets.STAGING_URL }} }
```

### 3.8 License rules (CycloneDX) — stretch

**NEW:** `.github/workflows/license.check.yml`

```yaml
name: license.check
on: [pull_request]
jobs:
  license:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
      - name: Fail on forbidden licenses
        run: |
          node -e '
            const fs=require("fs");
            const sbom=JSON.parse(fs.readFileSync("sbom.json"));
            const forbidden=new Set(["GPL-3.0","AGPL-3.0"]);
            const bad=[...new Set(sbom.components?.filter(c=>forbidden.has(c.licenses?.[0]?.license?.id)).map(c=>`${c.name}@${c.version}`))];
            if(bad.length){console.error("Forbidden licenses:\n"+bad.join("\n")); process.exit(1)}
          '
```

---

## 4) Observability & Evidence

- **Lineage dashboard**: Run → Artifacts (SBOM/provenance) → Gate → Deploy results; surface allow/deny with reasons.
- **Tamper‑evidence**: SHA256 for CI logs, OPA decision logs, and SBOM; store as artifacts and, optionally, object storage with immutability flag.

---

## 5) Tests & Verification

- **Policy**: `opa test policies -v` (new ABAC tests).
- **Admission**: Attempt deploy with unsigned image → **blocked**; signed & digest‑pinned → **allowed**.
- **Runtime**: `kubectl auth can-i`, `kubectl get networkpolicy`, check containers run non‑root & RO FS.
- **Perf**: k6 thresholds met (p95 < 400ms, <1% fail).
- **DLP**: `dlp.scan` workflow passes; secrets none.
- **e2e**: Step‑up prompt appears before `manage_policy`.

**Success Criteria**

- ArgoCD/Admission blocks unsigned/unpinned images.
- All Switchboard workloads baseline‑compliant (securityContext, NP, PDB/HPA).
- CI artifacts chained with hashes & attestations.
- Dashboards show green lineage for at least one tag deploy.

---

## 6) Ownership & Approvals

- **Owners:** SecDevOps (Angleton IG), Platform/Infra (ArgoCD/K8s), App Eng (e2e/Perf).
- **Approvals:** Platform lead (policies), App Eng lead (Playwright hooks), Security lead (ABAC policy).

---

## 7) Timeline

- **Days 1–2:** Admission/Kyverno + Gatekeeper policies; ArgoCD project updates.
- **Days 3–4:** OPA ABAC expansion + tests; CI deploy.verify wiring.
- **Days 5–6:** K8s runtime baseline overlays; DLP scan.
- **Day 7:** Perf baseline (k6) + thresholds; Playwright smoke.
- **Day 8–9:** Dashboards/lineage + tamper‑evidence; hardening polish.
- **Day 10:** Buffer + docs + approvals + tag a signed release.

---

## 8) PR Template Additions

```
- [ ] Cosign verify (deploy) passed
- [ ] Images pinned by digest
- [ ] NetworkPolicy + PDB/HPA present
- [ ] OPA ABAC tests added/updated
- [ ] DLP/secret scan clean
- [ ] Lineage artifacts uploaded (sbom.sha256, run.sha256, lineage.json)
```

---

## 9) Artifacts Index

- Admission/Kyverno/Gatekeeper: `deploy/policies/*.yaml`
- ArgoCD project: `deploy/argocd/projects/switchboard-project.yaml`
- CI verify: `.github/workflows/deploy.verify.yml`
- OPA: `policies/switchboard.rego`, `policies/switchboard_abac_test.rego`
- K8s overlays: `deploy/helm/switchboard/overlays/security.yaml`
- DLP: `.gitleaks.toml`, `.github/workflows/dlp.scan.yml`
- Perf: `tests/k6/smoke.js`, `.github/workflows/perf.k6.yml`
- e2e: `apps/web/e2e/stepup.spec.ts`, `.github/workflows/e2e.playwright.yml`
- License gate (stretch): `.github/workflows/license.check.yml`

---

## 10) Structured Output (for exec/PM traceability)

summary: Harden deploy/runtime with signature verification, ABAC policies, and cluster baselines; add DLP, perf, and e2e step‑up checks; produce tamper‑evident lineage.  
risk_score: 55  
confidence: high  
key_findings:

- id: deploy-verify-gap
  evidence: [ ci logs, lack of cluster admission rules ]
  impact: Unsigned/unpinned images could be deployed; weak provenance at runtime.
  exploit_path: Compromised build → push unsigned tag → Argo sync → workload runs.
- id: runtime-baseline-missing
  evidence: [ missing NetworkPolicies/PDB/HPA/securityContext ]
  impact: Lateral movement, instability under failure or load.
  exploit_path: Pod compromise → no NP isolation → pivot; outage without PDB/HPA.
- id: abac-policy-insufficient
  evidence: [ minimal RBAC/ABAC in current policy ]
  impact: Over-broad actions permitted; step‑up not provable in tests.
  exploit_path: Authenticated agent escalates action without sufficient role.
  recommended_actions:
- title: Enforce signed + digest‑pinned images at admission
  change_type: Policy
  effort: M
  prereqs: Kyverno or Gatekeeper installed; ArgoCD RBAC
- title: Expand OPA ABAC + tests
  change_type: PR
  effort: S
  prereqs: None
- title: Add deploy.verify with cosign + lineage
  change_type: PR
  effort: S
  prereqs: Artifact Attestations enabled
- title: Apply K8s runtime baselines
  change_type: Infra
  effort: M
  prereqs: Helm overlay wiring
- title: Add DLP, Perf, e2e suites
  change_type: PR
  effort: S
  prereqs: Staging URL and creds
  verification:
- checks: [ admission-blocks-unsigned, opa-abac-tests, k6-thresholds, playwright-stepup, dlp-clean ]
- success_criteria: Admission blocks on missing signature/digest; tests all green; lineage artifacts present.
  owners_notified: [ SecDevOps, Platform, App Eng ]
  links:
  pr:
  runbook: Reuse Sprint 1; add deploy.verify rollback (unsync Argo app)
  dashboards: CI→Gate→Deploy lineage board (to be updated after merge)
