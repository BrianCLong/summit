# PagerDuty & Statuspage Wiring + Helm Consumer Docs + Final Gap Sweep

This pack wires **PagerDuty** and **Statuspage** end‑to‑end using repository/cluster secrets and adds **consumer documentation** for installing our **signed Helm chart** from OCI with **cosign verify**. It also closes remaining gaps (rotation, runbooks, a11y/privacy notices, and error budgets).

---

## 0) Secrets — Where to put what

### 0.1 GitHub repository secrets (used by Actions)
- `PAGERDUTY_ROUTING_KEY` — Events v2 routing key (service integration).
- `STATUSPAGE_API_TOKEN` — Statuspage API token with incident/component scopes.
- `STATUSPAGE_PAGE_ID` — Target page ID.
- `STATUSPAGE_COMPONENT_MAP` — JSON `{ "Gateway API": "<component_id>", "Wallet": "<component_id>" }`.
- `STAGE_KC_ISSUER`, `STAGE_KC_CLIENT_SECRET`, `STAGE_GATEWAY_URL`, `STAGE_WEB_BASE_URL`, `STAGE_PROM_URL` — already used by other packs.

### 0.2 Kubernetes secrets (alertmanager)
```yaml
# ops/synthetics/pagerduty-secret.yaml
apiVersion: v1
kind: Secret
metadata: { name: alertmanager-pagerduty, namespace: observability }
stringData:
  routing_key: "$PAGERDUTY_ROUTING_KEY"
```
Apply with your real key substituted by your secret manager or `envsubst`.

---

## 1) Alertmanager wiring → PagerDuty

If you use kube‑prometheus‑stack, add this Alertmanager config:
```yaml
# ops/synthetics/alertmanager-pd.yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: alertmanager-config, namespace: observability }
data:
  alertmanager.yaml: |
    route:
      receiver: pagerduty
      routes:
      - matchers: [ severity = "critical" ]
        receiver: pagerduty
      - matchers: [ severity = "warning" ]
        receiver: pagerduty
    receivers:
    - name: pagerduty
      pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/routing_key
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .CommonAnnotations.summary }} — {{ .CommonAnnotations.description }}'
        send_resolved: true
---
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: alertmanager-kube-prometheus-stack-alertmanager, namespace: observability }
# NOTE: if using Helm, patch via values instead of editing manifest
spec:
  template:
    spec:
      volumes:
      - name: pd-key
        secret: { secretName: alertmanager-pagerduty }
      containers:
      - name: alertmanager
        volumeMounts:
        - name: pd-key
          mountPath: /etc/alertmanager/secrets
          readOnly: true
```
> With Helm: set `alertmanager.config` and `alertmanager.alertmanagerSpec.secrets` accordingly in values.

Prometheus rules from earlier pack (`synthetics-rules.prom`) will now notify PD.

---

## 2) Statuspage Automation — incidents & components

### 2.1 GitHub Action: open/resolve incidents on synthetic failures
```yaml
# .github/workflows/statuspage-bridge.yaml
name: statuspage-bridge
on:
  workflow_run:
    workflows: ["synthetics-check"]
    types: [requested, completed]
jobs:
  incident:
    if: ${{ github.event.workflow_run.conclusion != 'success' }}
    runs-on: ubuntu-latest
    steps:
      - name: Open/Update incident
        env:
          PAGE_ID: ${{ secrets.STATUSPAGE_PAGE_ID }}
          TOKEN: ${{ secrets.STATUSPAGE_API_TOKEN }}
          COMPONENT_MAP: ${{ secrets.STATUSPAGE_COMPONENT_MAP }}
        run: |
          comp_map=$(echo "$COMPONENT_MAP"|jq -c '.')
          title="Gateway/API degraded"
          body="Automated synthetic monitor detected failures in workflow ${GITHUB_EVENT_WORKFLOW_RUN_NAME}."
          comp=$(echo "$comp_map"|jq -r 'to_entries[0].value')
          curl -s -H "Authorization: OAuth $TOKEN" -H 'Content-Type: application/json' \
            -X POST https://api.statuspage.io/v1/pages/$PAGE_ID/incidents \
            -d "{\"incident\":{\"name\":\"$title\",\"status\":\"investigating\",\"body\":\"$body\",\"components\":{\"$comp\":\"major_outage\"}}}"
  resolve:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - name: Resolve recent incident (if any)
        env:
          PAGE_ID: ${{ secrets.STATUSPAGE_PAGE_ID }}
          TOKEN: ${{ secrets.STATUSPAGE_API_TOKEN }}
        run: |
          id=$(curl -s -H "Authorization: OAuth $TOKEN" https://api.statuspage.io/v1/pages/$PAGE_ID/incidents?limit=1 | jq -r '.[0].id')
          [ -z "$id" ] || curl -s -H "Authorization: OAuth $TOKEN" -H 'Content-Type: application/json' \
            -X PATCH https://api.statuspage.io/v1/pages/$PAGE_ID/incidents/$id \
            -d '{"incident":{"status":"resolved","body":"Automated synthetic monitor recovered."}}'
```

### 2.2 Component map example
```json
{"Gateway API":"abcd1234efgh","Wallet":"ijkl5678mnop"}
```

> Create components in Statuspage UI, paste IDs into the JSON secret.

---

## 3) Consumer Docs — Installing the Signed Helm Chart

### 3.1 Prereqs
- Helm v3.8+ with OCI support: `helm version`
- Cosign v2+: `cosign version`
- Access to GHCR (public or `helm registry login ghcr.io` if private)

### 3.2 Pull & verify signed chart (OCI)
```bash
# 1) Pull chart from GHCR (OCI)
export ORG=BrianCLong/intelgraph
export CHART=intelgraph
export VERSION=1.0.0
helm registry login ghcr.io -u <gh-username> -p <gh-token>   # if private
helm pull oci://ghcr.io/$ORG/charts/$CHART --version $VERSION -d ./charts

# 2) Verify chart signature with cosign keyless
cosign verify ghcr.io/$ORG/charts/$CHART:$VERSION \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp ".*github.com/$ORG.*"

# 3) Install/upgrade
helm upgrade --install intelgraph ./charts/$CHART-$VERSION.tgz \
  -n intelgraph --create-namespace \
  -f values.yaml \
  # optional env-specific overrides
  -f deploy/helm/intelgraph/values-stage.yaml \
  --set image.tag=v1.0.0-uni
```

> If you don’t want to store the .tgz locally, you can install directly from OCI after pull: `helm install intelgraph oci://ghcr.io/$ORG/charts/$CHART --version $VERSION` (note: cosign verification should still be performed separately).

### 3.3 Air‑gapped environments
- Export chart + SBOM: `helm pull …; cosign verify …; crane copy ghcr.io/$ORG/charts/$CHART:$VERSION oci://registry.local/$CHART:$VERSION`
- Mirror to internal registry and re‑sign with org’s Fulcio/rekor or offline key if required.

### 3.4 Values to set
- OIDC issuer/audience
- Vault CSI SecretProviderClass or direct Secrets
- Ingress host/TLS
- Resource limits per service

---

## 4) Runbooks

### 4.1 Rotate PagerDuty routing key
1. Create new Events v2 integration in the PD service.
2. Update GitHub secret `PAGERDUTY_ROUTING_KEY` & K8s secret `alertmanager-pagerduty`.
3. `kubectl rollout restart sts alertmanager-…`.
4. Fire a synthetic test (temporarily fail one probe) to see a new incident appear.

### 4.2 Rotate Statuspage API token
1. Generate new token in Statuspage.
2. Update `STATUSPAGE_API_TOKEN` in GitHub secrets.
3. Re‑run `statuspage-bridge` manually once to validate.

### 4.3 Verify signatures policy
- Gate deployments on `cosign verify` passing in CI (`helm-release` job outputs attestation URI).

---

## 5) Final Gap Sweep (closing loops)
- **Accessibility**: add `axe` checks already in CI; add aria‑labels for all buttons with `data-testid`.
- **Privacy**: publish `/docs/policies/privacy.md` + `/docs/policies/cookies.md`; link in webapp footer.
- **Error budgets**: define per service SLOs and budgets; wire alerts to PagerDuty.
- **Rate limit knobs**: expose gateway rate limit via configmap/values; document defaults.
- **SBOM consumption**: add docs for scanning the chart images via Trivy or Grype.
- **Support contact & on‑call rota**: `/docs/support/oncall.md` listing escalation paths.
- **Release notes automation**: GitHub Release notes templated; Statuspage “maintenance” integration optional.

---

## 6) Make & CLI helpers
```make
pd-secret:
	kubectl -n observability create secret generic alertmanager-pagerduty \
	  --from-literal=routing_key=$(PAGERDUTY_ROUTING_KEY) --dry-run=client -o yaml | kubectl apply -f -

statuspage-test-open:
	curl -s -H "Authorization: OAuth $(STATUSPAGE_API_TOKEN)" -H 'Content-Type: application/json' \
	  -X POST https://api.statuspage.io/v1/pages/$(STATUSPAGE_PAGE_ID)/incidents \
	  -d '{"incident":{"name":"Test incident","status":"investigating","body":"Test","components":{}}}'

helm-verify:
	cosign verify ghcr.io/$(ORG)/charts/$(CHART):$(VERSION) \
	  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
	  --certificate-identity-regexp ".*github.com/$(ORG).*"
```

---

## 7) Checklist
- [ ] Alertmanager reads PD key from K8s Secret; alerts route correctly
- [ ] `synthetics-check` triggers `statuspage-bridge` to open/resolve incidents
- [ ] Consumer doc verified by a fresh user (pull, verify, install)
- [ ] Rotation runbooks tested (PD and Statuspage)
- [ ] All policy/a11y/privacy docs linked in webapp

