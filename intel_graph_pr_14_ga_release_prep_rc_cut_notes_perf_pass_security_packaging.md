# IntelGraph – PR‑14 GA Release Prep (RC cut, notes, perf pass, security, packaging)

This package finalizes GA: RC branch cut + tagging, release notes, perf/security sign‑offs, SBOM + image signing, Helm chart bump, and training assets. All patches/scripts are copy‑pasteable.

---

## PR‑14 – Branch & PR

**Branch:** `release/ga-prep`  
**Open PR:**
```bash
git checkout -b release/ga-prep
# apply patches below, commit, push
gh pr create -t "GA Release Prep (RC cut, notes, perf/security, packaging)" -b "Cuts RC, adds release notes & scripts, SBOM + signing, Helm chart bump, perf/security gates, and training pack." -B develop -H release/ga-prep -l prio:P0,area:ops
```

---

## 1) Versioning & tagging conventions

- **SemVer**: `v0.9.0-rc.1` → GA `v0.9.0`
- Branches: `develop` → `release/rc` → `main`
- Tags: RC tags on `release/rc`, GA tag on `main`.

---

## 2) Release notes template & changelog generation

```diff
*** Begin Patch
*** Add File: .github/RELEASE_NOTES.md
+# IntelGraph GA v{{VERSION}}

## Highlights
- Graph Core & API (persisted queries + cost/slow guards)
- Governance (OPA ABAC + policy simulation)
- Copilot v1 (NL→Cypher preview, RAG with citations, guardrails)
- ER v1 (explainable scorecards, merge/split, override logs)
- Prov‑Ledger (beta) (evidence registry, Merkle manifests, DAG runner)
- Analytics v1 (centralities, patterns, hypothesis workbench)
- Connectors (10) + Ingest Wizard
- Observability (OTEL/Prom/Grafana), perf gate, demo assets

## Breaking changes
- N/A (MVP)

## Upgrade notes
- Recreate `.env` and run `make docker` to refresh services.

## Checksums
- Images signed (cosign), SBOM attached per image.

## Credits
- Contributors: @...
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/changelog.config.toml
[git]
conventional_commits = true
filter_unconventional = true

[bump]
initial_version = "0.9.0"
*** End Patch
```

```diff
*** Begin Patch
*** Add File: scripts/changelog.sh
#!/usr/bin/env bash
set -euo pipefail
VER=${1:?"usage: scripts/changelog.sh vX.Y.Z[-rc.N]"}
if ! command -v git-cliff >/dev/null; then
  echo "git-cliff required (https://github.com/orhun/git-cliff)"; exit 1; fi
GIT_CLIFF_CONFIG=.github/changelog.config.toml
git cliff -c $GIT_CLIFF_CONFIG -t "$VER" > CHANGELOG.md
echo "CHANGELOG.md for $VER updated"
*** End Patch
```

---

## 3) RC cut script & GA finalize

```diff
*** Begin Patch
*** Add File: scripts/release-cut.sh
#!/usr/bin/env bash
set -euo pipefail
VER=${1:?"usage: release-cut.sh vX.Y.Z-rc.N"}

# Ensure clean
[[ -z $(git status --porcelain) ]] || { echo "dirty tree"; exit 1; }

git checkout -B release/rc origin/develop || git checkout -b release/rc
git push -u origin release/rc || true

git tag -s "$VER" -m "$VER"
git push origin "$VER"

echo "RC $VER tagged on release/rc"
*** End Patch
```

```diff
*** Begin Patch
*** Add File: scripts/release-finalize.sh
#!/usr/bin/env bash
set -euo pipefail
VER=${1:?"usage: release-finalize.sh vX.Y.Z"}
RC_TAG="${VER}-rc.*"

git checkout main
git merge --no-ff release/rc -m "Merge release/rc for $VER"

git tag -s "$VER" -m "$VER"
git push origin main "$VER"

echo "GA $VER released"
*** End Patch
```

---

## 4) SBOM generation (Syft) & image signing (Cosign)

```diff
*** Begin Patch
*** Add File: .github/workflows/sbom-sign.yml
name: SBOM & Sign Images
on:
  workflow_dispatch:
  push:
    tags: [ 'v*' ]
jobs:
  sbom_sign:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Login GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
      - name: Install Syft
        uses: anchore/sbom-action/download-syft@v0
      - name: Build images
        run: |
          docker build -t ghcr.io/${{ github.repository }}/api:${{ github.ref_name }} -f services/api/Dockerfile .
          docker build -t ghcr.io/${{ github.repository }}/copilot:${{ github.ref_name }} -f services/copilot/Dockerfile .
          docker build -t ghcr.io/${{ github.repository }}/er:${{ github.ref_name }} -f services/er/Dockerfile .
          docker build -t ghcr.io/${{ github.repository }}/prov:${{ github.ref_name }} -f services/prov-ledger/Dockerfile .
          docker build -t ghcr.io/${{ github.repository }}/analytics:${{ github.ref_name }} -f services/analytics/Dockerfile .
      - name: Push images
        run: |
          for img in api copilot er prov analytics; do docker push ghcr.io/${{ github.repository }}/$img:${{ github.ref_name }}; done
      - name: Generate SBOMs
        run: |
          mkdir -p sbom
          for img in api copilot er prov analytics; do syft packages ghcr.io/${{ github.repository }}/$img:${{ github.ref_name }} -o spdx-json > sbom/$img.spdx.json; done
      - name: Attach SBOMs (GH Releases)
        uses: softprops/action-gh-release@v2
        with:
          files: sbom/*.spdx.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Sign images (keyless)
        run: |
          for img in api copilot er prov analytics; do cosign sign ghcr.io/${{ github.repository }}/$img:${{ github.ref_name }} --yes; done
*** End Patch
```

---

## 5) Security scanning (Trivy) & dependency review

```diff
*** Begin Patch
*** Add File: .github/workflows/security.yml
name: Security Scans
on:
  push:
    branches: [ develop, main ]
  pull_request:
jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@0.20.0
        with:
          scan-type: fs
          ignore-unfixed: true
          format: table
          exit-code: '1'
  dep-review:
    uses: actions/dependency-review-action/.github/workflows/dependency-review.yml@v4
*** End Patch
```

---

## 6) Helm chart bump & values

```diff
*** Begin Patch
*** Add File: infrastructure/helm/intelgraph/Chart.yaml
apiVersion: v2
name: intelgraph
version: 0.9.0
appVersion: 0.9.0
description: IntelGraph platform
*** End Patch
```

```diff
*** Begin Patch
*** Add File: infrastructure/helm/intelgraph/values.yaml
image:
  registry: ghcr.io
  repo: ${{ github.repository }}
  tag: latest
api:
  image: api
  port: 4000
copilot:
  image: copilot
  port: 4100
er:
  image: er
  port: 4200
prov:
  image: prov
  port: 4300
analytics:
  image: analytics
  port: 4400
*** End Patch
```

```diff
*** Begin Patch
*** Add File: infrastructure/helm/intelgraph/templates/deploy-api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers:
        - name: api
          image: {{ .Values.image.registry }}/{{ .Values.image.repo }}/{{ .Values.api.image }}:{{ .Values.image.tag }}
          ports: [{ containerPort: {{ .Values.api.port }} }]
          env:
            - name: NEO4J_URI
              value: bolt://neo4j:7687
            - name: OPA_URL
              value: http://opa:8181
---
apiVersion: v1
kind: Service
metadata: { name: api }
spec:
  selector: { app: api }
  ports: [{ port: 80, targetPort: {{ .Values.api.port }} }]
*** End Patch
```

(Repeat template pattern for copilot/er/prov/analytics as needed.)

---

## 7) RC/GA GitHub Actions

```diff
*** Begin Patch
*** Add File: .github/workflows/release-rc.yml
name: Release RC
on:
  push:
    tags: [ 'v*-rc.*' ]
jobs:
  rc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & publish charts
        run: make helm.package && make helm.index && make helm.publish
      - name: Generate changelog
        run: |
          VERSION=${{ github.ref_name }}
          bash scripts/changelog.sh "$VERSION"
      - name: Create RC Release
        uses: softprops/action-gh-release@v2
        with:
          prerelease: true
          tag_name: ${{ github.ref_name }}
          name: IntelGraph ${{ github.ref_name }}
          body_path: CHANGELOG.md
*** End Patch
```

```diff
*** Begin Patch
*** Add File: .github/workflows/release-ga.yml
name: Release GA
on:
  push:
    tags: [ 'v*[0-9]' ]
jobs:
  ga:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate changelog
        run: |
          VERSION=${{ github.ref_name }}
          bash scripts/changelog.sh "$VERSION"
      - name: Create GA Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ github.ref_name }}
          name: IntelGraph ${{ github.ref_name }}
          body_path: CHANGELOG.md
      - name: Publish Helm charts
        run: make helm.package && make helm.index && make helm.publish
*** End Patch
```

---

## 8) Final Perf Pass (thresholds) & Go/No‑Go Checklist

```diff
*** Begin Patch
*** Add File: docs/release/perf_checklist.md
# Perf Pass (GA)

- k6 `api_shortest_path.js` p95 < 1.5s, error rate < 0.5%
- k6 `api_entity_get.js`   p95 < 800ms, error rate < 0.5%
- UI bundle < 2.5 MB gz
- Neo4j cold start < 30s; steady memory < 1.5GB
- OPA latency p95 < 20ms local
*** End Patch
```

```diff
*** Begin Patch
*** Add File: docs/release/go_no_go.md
# Go / No‑Go (GA)

## Go criteria
- All CI jobs green (unit, integration, acceptance, perf gate)
- Vulnerability scans: critical=0, high<=2 (documented mitigations)
- SBOMs published; images signed (cosign)
- Demo walkthrough passes end‑to‑end

## No‑Go triggers
- Reproducible crash; data‑loss bug; policy bypass in ABAC

## Rollback Plan
- Retain RC images & chart index; `helm rollback` to previous revision
- Revert `main` to pre‑GA tag if necessary
*** End Patch
```

---

## 9) Training pack bundle & links in UI

```diff
*** Begin Patch
*** Add File: ui/web/src/components/HelpMenu.jsx
+import React from 'react';
+export default function HelpMenu(){
+  return (
+    <div style={{ position:'fixed', top:16, right:16 }}>
+      <a href="/docs/demo/ga_walkthrough.md" target="_blank" rel="noreferrer">GA Demo Guide</a> · {" "}
+      <a href="/docs/training/labs.md" target="_blank" rel="noreferrer">Training Labs</a>
+    </div>
+  );
+}
*** End Patch
```

```diff
*** Begin Patch
*** Update File: ui/web/src/App.jsx
@@
 import CopilotPanel from './components/CopilotPanel.jsx';
 import IngestWizard from './components/IngestWizard.jsx';
+import HelpMenu from './components/HelpMenu.jsx';
@@
       <CopilotPanel />
+      <HelpMenu />
*** End Patch
```

---

## 10) Usage (maintainers)

1. Cut RC: `bash scripts/release-cut.sh v0.9.0-rc.1`  
2. Verify RC pipeline (release notes, charts).  
3. Perf/security pass (docs/release/*).  
4. Finalize GA: `bash scripts/release-finalize.sh v0.9.0`  
5. Run SBOM/sign workflow (auto on tag).  
6. Publish training/demo materials.

---

## 11) Next after merge

- Add **SLSA provenance** generation with GitHub OIDC + `gha-provenance` attestation.
- Harden containers (non‑root, seccomp, read‑only FS) and enforce with Helm PSP/SCC/PodSecurity.
- Add **Helm tests** and **chart museum** publishing.
- Automate **changelog** via PR labels and Conventional Commits bot.

