# 1) Helm chart — support image digest pinning (patch)

**File:** `charts/intelgraph/values.yaml` (add digest field)

```yaml
image:
  repository: ghcr.io/<org>/intelgraph-server
  tag: latest
  digest: '' # when set, image will be pulled by digest
```

**File:** `charts/intelgraph/templates/deployment.yaml` (render image by digest when provided)

```diff
-        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
+        image: {{- if .Values.image.digest }}{{ .Values.image.repository }}@{{ .Values.image.digest }}{{- else }}{{ .Values.image.repository }}:{{ .Values.image.tag }}{{- end }}
         imagePullPolicy: IfNotPresent
```

> After this change, you can `--set-string image.digest=sha256:...` and the deployment will use the pinned digest.

---

# 2) Unified release.yml — pin digest + cosign sign/attest (patch)

**File:** `.github/workflows/release.yml` (insert/modify steps)

```diff
 jobs:
   build-publish:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: docker/login-action@v3
         with:
           registry: ghcr.io
           username: ${{ github.actor }}
           password: ${{ secrets.GITHUB_TOKEN }}
-      - uses: docker/build-push-action@v6
+      - id: build
+        uses: docker/build-push-action@v6
         with:
           context: .
           file: server/Dockerfile
           push: true
           tags: ghcr.io/${{ github.repository_owner }}/intelgraph-server:${{ github.ref_name }}
+      - name: Generate SBOM (syft)
+        uses: anchore/syft-action@v0.21.0
+        with: { image: ghcr.io/${{ github.repository_owner }}/intelgraph-server:${{ github.ref_name }}, output-file: sbom.syft.json, format: spdx-json }
+      - name: Install cosign
+        uses: sigstore/cosign-installer@v3.6.0
+      - name: Cosign sign image (keyless OIDC)
+        env:
+          COSIGN_EXPERIMENTAL: "true"
+        run: |
+          cosign sign --yes ghcr.io/${{ github.repository_owner }}/intelgraph-server@${{ steps.build.outputs.digest }}
+      - name: Cosign attest SBOM
+        env:
+          COSIGN_EXPERIMENTAL: "true"
+        run: |
+          cosign attest --yes \
+            --predicate sbom.syft.json \
+            --type spdx \
+            ghcr.io/${{ github.repository_owner }}/intelgraph-server@${{ steps.build.outputs.digest }}
```

**Deploy jobs** — set the digest when calling Helm (example for EKS; mirror in GKE/AKS blocks):

```diff
-      - name: Helm canary 10%
+      - name: Helm canary 10% (pinned digest)
         run: |
           helm upgrade --install ig charts/intelgraph \
             -f charts/intelgraph/values.prod.yaml \
-            --set image.tag=${{ github.ref_name }} \
+            --set image.tag=${{ github.ref_name }} \
+            --set-string image.digest=${{ needs.build-publish.outputs.digest || steps.build.outputs.digest }} \
             --set featureFlags.v24.coherence=true
```

> If your workflow uses separate jobs, expose the digest via job output:

```yaml
build-publish:
  outputs:
    digest: ${{ steps.build.outputs.digest }}
```

…and reference it as `${{ needs.build-publish.outputs.digest }}` in deploy jobs.

---

# 3) Grafana dashboard — v24 Coherence SLOs (JSON)

**File:** `kubernetes/grafana-dashboard.json`

```json
{
  "title": "v24 Coherence — API & Subscriptions SLOs",
  "schemaVersion": 38,
  "refresh": "10s",
  "time": { "from": "now-6h", "to": "now" },
  "panels": [
    {
      "type": "timeseries",
      "title": "GraphQL p95 duration (s)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[$__rate_interval])) by (le))"
        }
      ],
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
    },
    {
      "type": "timeseries",
      "title": "GraphQL p99 duration (s)",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(graphql_request_duration_seconds_bucket[$__rate_interval])) by (le))"
        }
      ],
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
    },
    {
      "type": "stat",
      "title": "Error rate % (5m)",
      "targets": [
        {
          "expr": "sum(rate(graphql_requests_total{status=~\"5..\"}[5m])) / sum(rate(graphql_requests_total[5m])) * 100"
        }
      ],
      "gridPos": { "h": 6, "w": 8, "x": 0, "y": 8 }
    },
    {
      "type": "timeseries",
      "title": "Subscription fan-out p95 (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(subscription_fanout_latency_ms_bucket[$__rate_interval])) by (le))"
        }
      ],
      "gridPos": { "h": 6, "w": 16, "x": 8, "y": 8 }
    },
    {
      "type": "gauge",
      "title": "SLO — Read p95 threshold",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(graphql_request_duration_seconds_bucket[5m])) by (le))"
        }
      ],
      "fieldConfig": { "defaults": { "max": 0.35 } },
      "gridPos": { "h": 6, "w": 8, "x": 0, "y": 14 }
    },
    {
      "type": "gauge",
      "title": "SLO — Sub fan-out p95 threshold",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(subscription_fanout_latency_ms_bucket[5m])) by (le))"
        }
      ],
      "fieldConfig": { "defaults": { "max": 250 } },
      "gridPos": { "h": 6, "w": 8, "x": 8, "y": 14 }
    },
    {
      "type": "stat",
      "title": "Requests per second",
      "targets": [
        { "expr": "sum(rate(graphql_requests_total[$__rate_interval]))" }
      ],
      "gridPos": { "h": 6, "w": 8, "x": 16, "y": 14 }
    }
  ],
  "templating": { "list": [] }
}
```

---

# 4) Git commands — safe branch cleanup & recovery

**Delete merged branch (local + remote)**

```bash
git checkout main && git pull
# Safety check — ensure fully merged
if git branch --merged main | grep -q "feature/v24-coherence-slice-1"; then
  git branch -d feature/v24-coherence-slice-1
else
  echo "Branch not fully merged into main; skipping local delete" && exit 1
fi
# Remote delete
git push origin --delete feature/v24-coherence-slice-1
```

**Recover (if needed)**

```bash
# From the release tag
git checkout -b feature/v24-coherence-slice-1 v24.0.0
# Or via reflog (find SHA then): git checkout -b feature/v24-coherence-slice-1 <sha>
```
