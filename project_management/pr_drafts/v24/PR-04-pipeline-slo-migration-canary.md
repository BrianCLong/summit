# PR 4 — Pipeline: SLO Burn Gate + Migration Gate + Canary Analyze

Title: feat(ci): add SLO burn, migration gate, and canary analysis to pipeline

Why: Enforce error‑budget/SLO and safe deploys.

Files changed:

- .maestro/pipeline.yaml (mod)
- Justfile (append)
- scripts/slo_burn_check.py (new)
- scripts/migration_gate.sh (new)
- scripts/canary_analyze.sh (new)

Patch (unified diff):

```diff
*** a/.maestro/pipeline.yaml
--- b/.maestro/pipeline.yaml
@@
   steps:
-    - id: build-all
-      run: just build-all
+    - id: setup-toolchains
+      run: just setup && node -v && pnpm -v && python -V
+
+    - id: build-all
+      run: just build-all
@@
     - id: conductor-smoke
       run: just conductor-smoke
+    - id: sbom-and-scan
+      run: just sbom && just trivy
+    - id: slo-burn-check
+      run: just slo-check
+      when: event == "push" || event == "pull_request"
+    - id: migration-gate
+      run: just migration-gate
+      when: files_changed("migrations/**")
+    - id: canary-deploy
+      run: just deploy --strategy=canary --weight=10
+      when: branch == "main" || tag != ""
+    - id: canary-analyze
+      run: just canary-analyze --budget .maestro/ci_budget.json
+      when: step_succeeded("canary-deploy")
+    - id: promote-or-rollback
+      run: just promote || just rollback
+      when: step_succeeded("canary-analyze")
```

Additions (append to `Justfile`):

```make
sbom:
	which syft >/dev/null || (echo "Install syft" && exit 1)
	syft packages dir:. -o cyclonedx-json > sbom.cdx.json

trivy:
	which trivy >/dev/null || (echo "Install trivy" && exit 1)
	trivy fs --exit-code 1 --severity HIGH,CRITICAL --ignorefile .trivyignore .

slo-check:
	python3 scripts/slo_burn_check.py --budget .maestro/ci_budget.json

migration-gate:
	bash scripts/migration_gate.sh

deploy *args:
	kubectl argo rollouts set image rollout/maestro $(shell yq '.images[] | .name + "=" + .newTag' charts/maestro/values.yaml)
	kubectl argo rollouts promote --percentage=10 rollout/maestro -n intelgraph

canary-analyze:
	bash scripts/canary_analyze.sh

promote:
	kubectl argo rollouts promote rollout/maestro -n intelgraph

rollback:
	kubectl argo rollouts abort rollout/maestro -n intelgraph
```

New files: see Sprint Execution Kit for script contents (identical).

Acceptance: CI blocks on SLO burn; migration changes require gate; canary analyzed; promote/rollback works on stage.

---

Shared: See SHARED-SECTIONS.md for risk, evidence, and operator commands.
