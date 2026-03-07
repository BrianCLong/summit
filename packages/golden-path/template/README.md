# **SERVICE_NAME** Golden Path Service

This service is generated from the golden-path template. It includes:

- Health, readiness, and Prometheus metrics endpoints.
- ABAC guardrails with deny-by-default policy.
- Residency enforcement and ingestion dedupe.
- Canary-friendly rollout hooks and compliance artifacts (SBOM, provenance, cosign).

## Local Dev

```
npm install
npm run dev
```

## Tests and CI

```
npm test
npm run lint
```

CI workflow lives in `.github/workflows/service-ci.yml` and blocks promotion without SBOM, provenance, and cosign signature.
