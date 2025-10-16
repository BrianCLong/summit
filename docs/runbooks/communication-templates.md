# Communications Templates

## Stakeholder Go/No‑Go (Slack)

```
:rocket: Release <vX.Y.Z> — GO/NO‑GO @ <time>
• CI gates: ✅
• Attestations: ✅ (SPDX+SLSA)
• Helm digests: ✅
• k6 canary plan: ready
If no objections in 10 min, proceeding to deploy.
```

## Post‑Deploy Update (Slack)

```
:white_check_mark: Release <vX.Y.Z> deployed.
• k6 canary p95: 412ms (target 700ms), error 0.2%
• Lighthouse perf: 0.87 (LCP 2.2s)
Evidence: <artifact link> | Images: <repo@sha256:…>
```

## Rollback Notice (Slack)

```
:warning: Rolling back <vX.Y.Z> to <vX.Y.(Z-1)> due to p95>1.2s and 5xx>1%. ETA 5 min.
Incident: <link> | Owner: @oncall
```
