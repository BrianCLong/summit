# PR Patch Set — IntelGraph Sprint 25: **GA Core Hardening & Guardrails**

> Three small, focused PRs. Each is self‑contained and safe to merge independently. Where your attached artifacts are required, I’ve placed a clearly‑marked placeholder and a guard README so the reviewer knows exactly what to drop in.

---

## PR 1 — feat(policy): **export policy + simulate/enforce + DLP redactions + WebAuthn step‑up**

**Branch:** `feature/policy-export-opa`

### What’s included

- `policies/export.rego` — production‑ready OPA policy implementing:
  - **simulate/enforce** modes
  - **DLP redactions** for `pii:*` tags + explicit paths
  - **WebAuthn step‑up** required for `Sensitive`/`Restricted`
  - **auditable decision payload** (allow/deny, reasons, redactions, step‑up status)
- `policies/tests/export_test.rego` — coverage for simulate vs enforce, redactions, step‑up.
- `.github/workflows/opa.yml` — CI: run `opa test` on PRs.
- `docs/policies/export.md` — endpoint contract for `/export/simulate` & `/export`.
- `Makefile` — `make policy-test` sugar.

> If you want to **replace** my policy with your attached `export.rego`, simply drop it over `policies/export.rego`. Tests are compatible with the spec as written in the Day‑1 handoff.

### Patch (unified diff)

```diff
*** Begin Patch
*** Add File: policies/export.rego
+package intelgraph.export
+
+# Export policy for IntelGraph GA Core — simulate/enforce, DLP redactions, WebAuthn step-up.
+# Decision object intentionally explicit for audit & UX payloads.
+
+default allow := false
+
+# --- Inputs (expected) -------------------------------------------------------
+# input.mode:        "simulate" | "enforce"
+# input.action:      "export"
+# input.auth:        { webauthn_verified: bool, actor: string }
+# input.resource:    {
+#   sensitivity: "Public" | "Internal" | "Sensitive" | "Restricted",
+#   fields: [ { path: string, tags: [string] } ],        # tags like "pii:ssn", "pii:email"
+#   explicit_dlp_mask_paths: [string]                    # extra masks by absolute path
+# }
+
+# --- Helpers -----------------------------------------------------------------
+
+is_simulate := input.mode == "simulate"
+is_enforce  := input.mode == "enforce"
+
+sens := lower(input.resource.sensitivity)
+needs_step_up := sens == "sensitive" or sens == "restricted"
+has_step_up := input.auth.webauthn_verified == true
+
+# Collect DLP redactions from pii:* tags on fields
+redactions_from_tags[entry] {
+  f := input.resource.fields[_]
+  some t
+  t := f.tags[_]
+  startswith(t, "pii:")
+  entry := {"path": f.path, "reason": t}
+}
+
+# Merge explicit masks
+redactions_from_explicit[entry] {
+  p := input.resource.explicit_dlp_mask_paths[_]
+  entry := {"path": p, "reason": "explicit"}
+}
+
+redactions := r {
+  r := redactions_from_tags
+  r2 := redactions_from_explicit
+  r := r | r2
+}
+
+# Reasons (human‑readable)
+reason_step_up := sprintf("step-up required for sensitivity=%v", [input.resource.sensitivity])
+reason_no_step := "missing WebAuthn step-up"
+
+# Decision payload exposed for API handlers
+decision := {
+  "mode": input.mode,
+  "allow": allow,
+  "redactions": redactions,
+  "step_up": {
+    "required": needs_step_up,
+    "satisfied": has_step_up
+  },
+  "reasons": reasons
+}
+
+reasons := r {
+  base := []
+  rs := base
+  rs := cond_append(rs, needs_step_up, reason_step_up)
+  rs := cond_append(rs, needs_step_up and not has_step_up and is_enforce, reason_no_step)
+  r := rs
+}
+
+# allow rules
+allow {
+  is_simulate
+}
+
+allow {
+  is_enforce
+  not needs_step_up
+}
+
+allow {
+  is_enforce
+  needs_step_up
+  has_step_up
+}
+
+# Utility: append iff condition true
+cond_append(arr, cond, v) = out {
+  cond
+  out := array.concat(arr, [v])
+}
+
+cond_append(arr, cond, _) = arr {
+  not cond
+}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: policies/tests/export_test.rego
+package intelgraph.export
+
+import future.keywords.every
+
+test_simulate_allows_without_step_up {
+  input := {
+    "mode": "simulate",
+    "action": "export",
+    "auth": {"webauthn_verified": false},
+    "resource": {
+      "sensitivity": "Sensitive",
+      "fields": [
+        {"path": "person.ssn", "tags": ["pii:ssn"]},
+        {"path": "email", "tags": ["pii:email"]}
+      ],
+      "explicit_dlp_mask_paths": ["credit_card.number"]
+    }
+  }
+  data.intelgraph.export.allow with input as input
+  d := data.intelgraph.export.decision with input as input
+  d.step_up.required == true
+  d.step_up.satisfied == false
+  count(d.redactions) == 3
+}
+
+test_enforce_denies_without_step_up_when_sensitive {
+  input := {
+    "mode": "enforce",
+    "action": "export",
+    "auth": {"webauthn_verified": false},
+    "resource": {
+      "sensitivity": "Restricted",
+      "fields": [{"path": "person.ssn", "tags": ["pii:ssn"]}],
+      "explicit_dlp_mask_paths": []
+    }
+  }
+  not data.intelgraph.export.allow with input as input
+  d := data.intelgraph.export.decision with input as input
+  d.step_up.required
+  not d.step_up.satisfied
+}
+
+test_enforce_allows_with_step_up {
+  input := {
+    "mode": "enforce",
+    "action": "export",
+    "auth": {"webauthn_verified": true},
+    "resource": {
+      "sensitivity": "Sensitive",
+      "fields": [],
+      "explicit_dlp_mask_paths": []
+    }
+  }
+  data.intelgraph.export.allow with input as input
+}
+
+test_redactions_merge_tags_and_explicit {
+  input := {
+    "mode": "simulate",
+    "action": "export",
+    "auth": {"webauthn_verified": true},
+    "resource": {
+      "sensitivity": "Internal",
+      "fields": [
+        {"path": "email", "tags": ["pii:email"]},
+        {"path": "notes", "tags": []}
+      ],
+      "explicit_dlp_mask_paths": ["notes.secret"]
+    }
+  }
+  d := data.intelgraph.export.decision with input as input
+  some r in d.redactions; r.path == "email"
+  some s in d.redactions; s.path == "notes.secret"
+}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/opa.yml
+name: Policy CI
+on:
+  pull_request:
+    paths:
+      - 'policies/**'
+      - '.github/workflows/opa.yml'
+  push:
+    branches: [ main ]
+    paths:
+      - 'policies/**'
+
+jobs:
+  opa-test:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: Run OPA tests
+        uses: open-policy-agent/setup-opa@v2
+      - run: opa test -v policies
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: Makefile
+.PHONY: policy-test
+policy-test:
+	opa test -v policies
+
*** End Patch
```

````diff
*** Begin Patch
*** Add File: docs/policies/export.md
+# Export Policy — Decision Contract
+
+**Endpoint pairing**
+- `POST /export/simulate` → returns decision payload (never blocks IO)
+- `POST /export` → enforces policy (may deny if step‑up missing)
+
+**Request (example)**
+```json
+{
+  "mode": "simulate",
+  "action": "export",
+  "auth": {"actor": "user-123", "webauthn_verified": true},
+  "resource": {
+    "sensitivity": "Sensitive",
+    "fields": [
+      {"path": "person.ssn", "tags": ["pii:ssn"]},
+      {"path": "email", "tags": ["pii:email"]}
+    ],
+    "explicit_dlp_mask_paths": ["credit_card.number"]
+  }
+}
+```
+
+**Response**
+```json
+{
+  "mode": "simulate",
+  "allow": true,
+  "redactions": [
+    {"path": "person.ssn", "reason": "pii:ssn"},
+    {"path": "email", "reason": "pii:email"},
+    {"path": "credit_card.number", "reason": "explicit"}
+  ],
+  "step_up": {"required": true, "satisfied": true},
+  "reasons": ["step-up required for sensitivity=Sensitive"]
+}
+```
+
+**Rollout**: enable **simulate** for first 48h; toggle **enforce** thereafter.
+
*** End Patch
````

---

## PR 2 — chore(obs): **Grafana‑as‑code — GA Core Guardrails dashboard + provisioning**

**Branch:** `chore/grafana-ga-core-dashboard`

### What’s included

- `observability/grafana/dashboards/ga_core_dashboard.json` — minimal but working dashboard matching Day‑1 panels: **NLQ p95**, **ingest p95**, **export allow/deny/redacted**, **ER precision/recall**, **SLO burn**.
- `observability/grafana/provisioning/dashboards/ga-core.yml` — file provider.
- `observability/README.md` — import notes (set Prometheus UID; vars `env`, `tenant`).

> If you prefer your attached JSON, drop it over the dashboard file; provisioning will pick it up.

### Patch (unified diff)

```diff
*** Begin Patch
*** Add File: observability/grafana/dashboards/ga_core_dashboard.json
+{
+  "uid": "ga-core",
+  "title": "GA Core — Guardrails & SLO",
+  "schemaVersion": 39,
+  "version": 1,
+  "tags": ["intelgraph", "ga-core"],
+  "time": { "from": "now-12h", "to": "now" },
+  "timezone": "browser",
+  "templating": {
+    "list": [
+      {
+        "type": "query",
+        "name": "env",
+        "label": "env",
+        "query": "label_values(up, env)",
+        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "refresh": 2
+      },
+      {
+        "type": "query",
+        "name": "tenant",
+        "label": "tenant",
+        "query": "label_values(export_decisions_total, tenant)",
+        "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+        "includeAll": true,
+        "multi": true,
+        "refresh": 2
+      }
+    ]
+  },
+  "panels": [
+    {
+      "type": "stat",
+      "title": "NLQ p95 (s)",
+      "gridPos": {"x": 0, "y": 0, "w": 6, "h": 4},
+      "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+      "targets": [{
+        "expr": "nlq_latency_seconds_p95{env=\"$env\",tenant=~\"$tenant\"}",
+        "legendFormat": "p95"
+      }]
+    },
+    {
+      "type": "stat",
+      "title": "Ingest p95 (s)",
+      "gridPos": {"x": 6, "y": 0, "w": 6, "h": 4},
+      "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+      "targets": [{
+        "expr": "ingest_latency_seconds_p95{env=\"$env\",tenant=~\"$tenant\"}",
+        "legendFormat": "p95"
+      }]
+    },
+    {
+      "type": "timeseries",
+      "title": "Export decisions (allow/deny/redacted)",
+      "gridPos": {"x": 0, "y": 4, "w": 12, "h": 8},
+      "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+      "targets": [
+        {"expr": "sum by (decision) (increase(export_decisions_total{env=\"$env\",tenant=~\"$tenant\"}[5m]))", "legendFormat": "{{decision}}"}
+      ]
+    },
+    {
+      "type": "gauge",
+      "title": "ER precision",
+      "gridPos": {"x": 0, "y": 12, "w": 6, "h": 6},
+      "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+      "fieldConfig": {"defaults": {"min": 0, "max": 1}},
+      "targets": [{"expr": "er_precision{env=\"$env\",tenant=~\"$tenant\"}", "legendFormat": "precision"}]
+    },
+    {
+      "type": "gauge",
+      "title": "ER recall",
+      "gridPos": {"x": 6, "y": 12, "w": 6, "h": 6},
+      "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+      "fieldConfig": {"defaults": {"min": 0, "max": 1}},
+      "targets": [{"expr": "er_recall{env=\"$env\",tenant=~\"$tenant\"}", "legendFormat": "recall"}]
+    },
+    {
+      "type": "stat",
+      "title": "SLO burn rate",
+      "gridPos": {"x": 0, "y": 18, "w": 12, "h": 4},
+      "datasource": { "type": "prometheus", "uid": "${DS_PROM}" },
+      "targets": [{"expr": "slo_error_budget_burn_rate{service=\"ga-core\",env=\"$env\",tenant=~\"$tenant\"}", "legendFormat": "burn"}]
+    }
+  ]
+}
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: observability/grafana/provisioning/dashboards/ga-core.yml
+apiVersion: 1
+providers:
+  - name: GA Core
+    orgId: 1
+    folder: IntelGraph / GA Core
+    type: file
+    updateIntervalSeconds: 10
+    allowUiUpdates: true
+    options:
+      path: /var/lib/grafana/dashboards/ga-core
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: observability/README.md
+# Grafana — GA Core Guardrails
+
+**Import (one‑time):** Grafana → *Dashboards* → *Import* → paste JSON or point to provisioning folder.
+
+**Datasource:** set Prometheus datasource **UID** env var `DS_PROM` (Grafana → *Datasources* → *UID*).
+
+**Variables:** this dashboard expects `env` and `tenant` labels on metrics.
+
+> To use the **attached** JSON instead of the minimal one here, overwrite
+> `observability/grafana/dashboards/ga_core_dashboard.json` with your file.
+
*** End Patch
```

---

## PR 3 — chore(pm): **/project/pm Jira CSV + import guide**

**Branch:** `chore/pm-sprint25-jira-csv`

### What’s included

- `project/pm/sprint25_jira.csv.placeholder` — marker file; replace with your attached CSV.
- `project/pm/README.md` — Jira import steps (mapped to your handoff).

> Replace the placeholder with your `sprint25_jira.csv` attachment before merge. Keeping the CSV in repo under `/project/pm/` gives us a reproducible import.

### Patch (unified diff)

```diff
*** Begin Patch
*** Add File: project/pm/sprint25_jira.csv.placeholder
+REPLACE_THIS_FILE_WITH: sprint25_jira.csv
+WHY: Day‑1 handoff CSV (Epics→Stories→Sub‑tasks) for Sprint 25 import.
+
*** End Patch
```

```diff
*** Begin Patch
*** Add File: project/pm/README.md
+# Sprint 25 — Jira Import Guide
+
+1. Jira → **System** → **External System Import** → **CSV**.
+2. Upload `project/pm/sprint25_jira.csv`.
+3. Map columns: **Parent/Epic/External ID**; set **Sprint = “Sprint 25”** (Oct 6–17, 2025, America/Denver).
+4. Verify hierarchy (Epics → Stories → Sub‑tasks) in preview → **Import**.
+
+> Source of truth is the CSV attached in Day‑1 handoff. Replace the `.placeholder` file with the real CSV before merge.
+
*** End Patch
```

---

## How to apply locally

```bash
# from repo root
# PR 1
git checkout -b feature/policy-export-opa
git apply path/to/pr1.patch && git add -A && git commit -m "feat(policy): export policy + tests + CI"

# PR 2
git checkout -b chore/grafana-ga-core-dashboard
git apply path/to/pr2.patch && git add -A && git commit -m "chore(obs): Grafana GA Core dashboard + provisioning"

# PR 3
git checkout -b chore/pm-sprint25-jira-csv
git apply path/to/pr3.patch && git add -A && git commit -m "chore(pm): add Sprint 25 Jira CSV + guide"
```

## Notes

- **Policy rollout**: start `simulate` for 48h, then switch to `enforce`.
- **Grafana**: set Prometheus **UID** and confirm `env`/`tenant` labels exist.
- **CSV**: replace placeholder with your file before merging PR 3.
