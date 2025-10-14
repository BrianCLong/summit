# Incident Context Wiring + Customer Onboarding Kit (15‑Minute Self‑Install)

This pack does two things:
1) **Wires incident context** (trace IDs, tenant, severity, links) into **PagerDuty** and **Statuspage** payloads, from alert → incident with deep links to Jaeger & Grafana.
2) Ships a **Customer Onboarding Kit** with sample Helm values, a preflight script, and a minute‑by‑minute checklist so new tenants can self‑install in < 15 minutes.

---

## 1) Incident Context Wiring

### 1.1 Prometheus rules: add labels & annotations
```yaml
# ops/synthetics/synthetics-rules.prom (replace group)
groups:
- name: synthetics.rules
  rules:
  - alert: GatewayDown
    expr: probe_success{job="blackbox-gateway"} == 0
    for: 2m
    labels:
      severity: critical
      team: intelgraph
      tenant: pilot
    annotations:
      summary: "Gateway GraphQL unreachable"
      description: "Synthetic probe failed for 2m. Ingress, DNS, or pods may be unhealthy."
      runbook: "https://internal.docs/runbooks/gateway-down"
      # Pass trace, links (if scrape emitted X-Trace-Id header metric; else leave blank)
      trace_id: "{{ $labels.trace_id }}"
      jaeger_link: "https://jaeger.example.com/search?traceID={{ $labels.trace_id }}"
      grafana_link: "https://grafana.example.com/d/a1b2c3/intelgraph-ga?var-tenant={{ $labels.tenant }}"
  - alert: WalletVerifyDown
    expr: probe_success{job="blackbox-wallet"} == 0
    for: 5m
    labels:
      severity: warning
      team: intelgraph
      tenant: pilot
    annotations:
      summary: "Wallet verify endpoint unreachable"
      description: "Wallet health probe failing (5m)."
      runbook: "https://internal.docs/runbooks/wallet-down"
      trace_id: "{{ $labels.trace_id }}"
      jaeger_link: "https://jaeger.example.com/search?traceID={{ $labels.trace_id }}"
      grafana_link: "https://grafana.example.com/d/a1b2c3/intelgraph-ga?var-tenant={{ $labels.tenant }}"
```

> If your blackbox exporter doesn’t emit `trace_id`, you can enrich metrics at the gateway: export a synthetic probe endpoint that returns `X-Trace-Id` header, scrape with `headers: [X-Trace-Id]` and map via recording rule into a label. Optional; links still work without it.

### 1.2 Alertmanager → PagerDuty: custom details & links
```yaml
# ops/synthetics/alertmanager-pd.yaml (receivers section only)
receivers:
- name: pagerduty
  pagerduty_configs:
  - routing_key_file: /etc/alertmanager/secrets/routing_key
    severity: '{{ .CommonLabels.severity }}'
    class: 'synthetic'
    component: '{{ .CommonLabels.job }}'
    group: '{{ .CommonLabels.team }}'
    dedup_key: '{{ .GroupLabels.alertname }}:{{ .CommonLabels.tenant }}'
    details:
      tenant: '{{ .CommonLabels.tenant }}'
      runbook: '{{ .CommonAnnotations.runbook }}'
      grafana: '{{ .CommonAnnotations.grafana_link }}'
      jaeger: '{{ .CommonAnnotations.jaeger_link }}'
      trace_id: '{{ .CommonAnnotations.trace_id }}'
      summary: '{{ .CommonAnnotations.summary }}'
      description: '{{ .CommonAnnotations.description }}'
    send_resolved: true
```

### 1.3 Statuspage bridge: include rich body & component statuses
```yaml
# .github/workflows/statuspage-bridge.yaml (replace steps)
name: statuspage-bridge
on:
  workflow_run:
    workflows: ["synthetics-check"]
    types: [completed]
jobs:
  incident:
    runs-on: ubuntu-latest
    steps:
      - name: Compose incident body
        id: ctx
        env:
          COMPONENT_MAP: ${{ secrets.STATUSPAGE_COMPONENT_MAP }}
        run: |
          comp_map=$(echo "$COMPONENT_MAP"|jq -c '.')
          echo "comp_id=$(echo $comp_map | jq -r '."Gateway API"')" >> $GITHUB_OUTPUT
      - name: Open/Update incident on failure
        if: ${{ github.event.workflow_run.conclusion != 'success' }}
        env:
          PAGE_ID: ${{ secrets.STATUSPAGE_PAGE_ID }}
          TOKEN: ${{ secrets.STATUSPAGE_API_TOKEN }}
          COMP_ID: ${{ steps.ctx.outputs.comp_id }}
        run: |
          title="Gateway/API degraded"
          # Include deep links to Grafana/Jaeger and tenant
          body=$(jq -Rn --arg t "${{ github.run_id }}" \
                      --arg g "https://grafana.example.com/d/a1b2c3/intelgraph-ga" \
                      --arg j "https://jaeger.example.com/search" \
                      --arg ten "pilot" \
                      '{"tenant":$ten,"grafana":$g,"jaeger":$j,"run_id":$t}')
          curl -s -H "Authorization: OAuth $TOKEN" -H 'Content-Type: application/json' \
            -X POST https://api.statuspage.io/v1/pages/$PAGE_ID/incidents \
            -d "{\"incident\":{\"name\":\"$title\",\"status\":\"investigating\",\"body\":$body,\"components\":{\"$COMP_ID\":\"major_outage\"}}}"
      - name: Resolve on recovery
        if: ${{ github.event.workflow_run.conclusion == 'success' }}
        env:
          PAGE_ID: ${{ secrets.STATUSPAGE_PAGE_ID }}
          TOKEN: ${{ secrets.STATUSPAGE_API_TOKEN }}
        run: |
          id=$(curl -s -H "Authorization: OAuth $TOKEN" https://api.statuspage.io/v1/pages/$PAGE_ID/incidents?limit=1 | jq -r '.[0].id')
          [ -z "$id" ] || curl -s -H "Authorization: OAuth $TOKEN" -H 'Content-Type: application/json' \
            -X PATCH https://api.statuspage.io/v1/pages/$PAGE_ID/incidents/$id \
            -d '{"incident":{"status":"resolved","body":"Automated synthetic monitor recovered. Links: https://grafana.example.com/d/a1b2c3/intelgraph-ga"}}'
```

---

## 2) Customer Onboarding Kit — 15‑Minute Self‑Install

### 2.1 Folder structure
```
onboarding/
  values-sample.yaml
  preflight.sh
  quickstart.md
  checklist.md
  faq.md
```

### 2.2 Sample values (minimal viable)
```yaml
# onboarding/values-sample.yaml
image:
  tag: v1.0.0-uni
commonEnv:
  KEYCLOAK_ISSUER: https://keycloak.yourcompany.com/auth/realms/intelgraph
  KEYCLOAK_AUDIENCE: intelgraph-api
  NEO4J_URL: bolt://neo4j.yourcompany.local:7687
  NEO4J_USER: neo4j
  LAC_URL: http://lac:7001
  LEDGER_URL: http://ledger:7002
  ANALYTICS_URL: http://analytics:7003
  NL_URL: http://nl2cypher:7005
  CASE_URL: http://case:7006
  REPORT_URL: http://report:7007
  RUNBOOK_URL: http://runbook:7008
  BUDGET_URL: http://budget:7009
  XAI_URL: http://xai:7012
  FED_URL: http://fed:7013
  WALLET_URL: http://wallet:7014
flags:
  enableXAI: true
  enableFederation: true
  enableWallets: true
  strictOPA: true
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: intelgraph.yourcompany.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: intelgraph-tls
      hosts: [intelgraph.yourcompany.com]
serviceAccount:
  name: intelgraph-app
csi:
  secretProviderClass: intelgraph-vault
```

### 2.3 Preflight script
```bash
# onboarding/preflight.sh
set -euo pipefail
RED=$'\e[31m'; GRN=$'\e[32m'; YLW=$'\e[33m'; NC=$'\e[0m'
step(){ echo "$YLW➤ $1$NC"; }
ok(){ echo "$GRN✔ $1$NC"; }
fail(){ echo "$RED✘ $1$NC"; exit 1; }

step "Check kubectl context"
kubectl cluster-info >/dev/null || fail "kubectl not configured"

step "Check storage class"
kubectl get sc >/dev/null || fail "No StorageClass found"

step "Check ingress controller"
kubectl get deploy -A | grep -q ingress || echo "(info) no ingress found — ensure ingressClass matches"

step "Check Helm & OCI"
helm version >/dev/null || fail "Helm not installed"
cosign version >/dev/null || fail "cosign not installed"

step "Check OIDC issuer"
: "${KEYCLOAK_ISSUER:?set KEYCLOAK_ISSUER}"; curl -fsS "$KEYCLOAK_ISSUER/.well-known/openid-configuration" >/dev/null && ok "OIDC reachable"

step "Check Vault CSI (optional)"
kubectl get secretproviderclass -A >/dev/null && ok "Found SecretProviderClass" || echo "(warn) No SecretProviderClass — using plain Secrets"

step "DNS & TLS"
: "${HOSTNAME:?set HOSTNAME}"; dig +short "$HOSTNAME" >/dev/null || echo "(warn) DNS for $HOSTNAME not resolvable here"

ok "Preflight OK"
```

### 2.4 Quickstart (minute‑by‑minute)
```md
# onboarding/quickstart.md
**0–3 min**: Preflight
- `export KEYCLOAK_ISSUER=...; export HOSTNAME=intelgraph.yourcompany.com`
- `bash onboarding/preflight.sh`

**3–6 min**: Pull & verify chart
- `export ORG=BrianCLong/intelgraph; export CHART=intelgraph; export VERSION=1.0.0`
- `helm registry login ghcr.io -u <gh-user> -p <token>` (if private)
- `helm pull oci://ghcr.io/$ORG/charts/$CHART --version $VERSION -d ./charts`
- `cosign verify ghcr.io/$ORG/charts/$CHART:$VERSION --certificate-oidc-issuer https://token.actions.githubusercontent.com --certificate-identity-regexp ".*github.com/$ORG.*"`

**6–10 min**: Prepare values
- Copy `onboarding/values-sample.yaml` → `my-values.yaml`; set hosts, OIDC, secrets

**10–12 min**: Install
- `helm upgrade --install intelgraph ./charts/$CHART-$VERSION.tgz -n intelgraph --create-namespace -f my-values.yaml`

**12–15 min**: Smoke
- Open `https://intelgraph.yourcompany.com` → login via Keycloak
- `make e2e-demo` (optional local) or run `ops/smoke/post-deploy.sh` with your URLs
```

### 2.5 Checklist
```md
- [ ] DNS + TLS pointed to ingress
- [ ] Keycloak realm configured (clients: intelgraph-web/api)
- [ ] Secrets mounted (Vault CSI or K8s Secret)
- [ ] Helm install succeeded; pods Ready
- [ ] GraphQL reachable; NL→Cypher preview works
- [ ] Analytics PageRank returns results
- [ ] Policy Inspector denial shows reason (OPA)
- [ ] Optional: Wallet issue/verify OK
```

### 2.6 FAQ
```md
**Q: Our Keycloak uses a different claim for tenant.**
A: Update client scope mapper to emit `tnt` claim or set a mapper in gateway to read your claim name.

**Q: We don’t run Vault CSI.**
A: Replace `csi.secretProviderClass` with `envFrom.secretRef` and create a standard Secret named `intelgraph-secrets`.

**Q: SSL offload at external LB?**
A: Set `ingress.tls` to false and terminate TLS at LB; ensure `KEYCLOAK_ISSUER` still uses https.
```

---

## 3) Make helpers
```make
onboarding-preflight:
	KEYCLOAK_ISSUER=$(KEYCLOAK_ISSUER) HOSTNAME=$(HOSTNAME) bash onboarding/preflight.sh

onboarding-install:
	helm pull oci://ghcr.io/$(ORG)/charts/$(CHART) --version $(VERSION) -d ./charts
	cosign verify ghcr.io/$(ORG)/charts/$(CHART):$(VERSION) \
	  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
	  --certificate-identity-regexp ".*github.com/$(ORG).*"
	helm upgrade --install intelgraph ./charts/$(CHART)-$(VERSION).tgz -n intelgraph --create-namespace -f onboarding/values-sample.yaml
```

---

## 4) Verification & Rollback
- **PagerDuty**: Trigger a synthetic failure; PD event should include `tenant`, `trace_id`, and deep links.
- **Statuspage**: Incident body JSON shows `tenant`, Grafana & Jaeger links.
- **Rollback**: `helm rollback intelgraph <REV>`; incidents resolve when synthetics recover.

---

## 5) Notes
- Replace example Grafana/Jaeger URLs with your observability endpoints.
- Keep `STATUSPAGE_COMPONENT_MAP` updated when adding components.
- For multi‑tenant, template the tenant label in rules via `$labels.namespace` or URL host.

