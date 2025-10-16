# PR 5 — Release Train Enhancement + Reusable SLO Job

Title: feat(ci): enhance release-train with SLO gate & canary; add reusable slo-burn-check

Files:

- .github/workflows/release-train.yml (mod)
- .github/workflows/reusable/slo-burn-check.yml (new)

Patch:

```diff
*** a/.github/workflows/release-train.yml
--- b/.github/workflows/release-train.yml
@@
-name: Release Train
-on:
-  schedule: [{ cron: '0 18 * * 4' }] # Thu 18:00 UTC
-  workflow_dispatch: {}
-
-jobs:
-  deploy:
-    runs-on: ubuntu-latest
-    steps:
-      - uses: actions/checkout@v4
-      - name: Deploy Release Train
-        run: echo "Release train deployment completed"
+name: release-train
+on:
+  push:
+    branches: [ main ]
+  workflow_dispatch: {}
+
+concurrency:
+  group: release-train-${{ github.ref }}
+  cancel-in-progress: false
+
+jobs:
+  build-test-scan:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with: { node-version: '20', cache: 'pnpm' }
+      - uses: pnpm/action-setup@v4
+        with: { version: 9 }
+      - name: Setup Python
+        uses: actions/setup-python@v5
+        with: { python-version: '3.12' }
+      - name: Build & test
+        run: |
+          just setup
+          just build-all
+          just test-unit
+          just test-contract
+      - name: SBOM & scan
+        run: |
+          just sbom
+          just trivy
+
+  gate-and-deploy:
+    needs: build-test-scan
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: SLO burn check
+        uses: ./.github/workflows/reusable/slo-burn-check.yml
+        with:
+          budget_path: .maestro/ci_budget.json
+        secrets:
+          PROM_URL: ${{ secrets.PROM_URL }}
+      - name: Canary deploy (10%)
+        run: |
+          kubectl config set-context --current --namespace=intelgraph
+          just deploy --strategy=canary --weight=10
+      - name: Canary analyze
+        run: PROM_URL=${{ secrets.PROM_URL }} just canary-analyze
+      - name: Promote or rollback
+        run: just promote || just rollback
```

New: .github/workflows/reusable/slo-burn-check.yml with workflow_call (see kit for content).

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
