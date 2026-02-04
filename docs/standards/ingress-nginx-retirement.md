# Ingress NGINX Retirement Standard

## Executive Summary

Ingress NGINX reaches end-of-support in March 2026. The Summit governance bundle for this event
enforces detection, regression denial, and evidence-grade reporting while remaining controller
neutral. This standard defines the inputs, outputs, and policy gates required for compliance with
the retirement timeline and Summit readiness posture.

## Scope

- Repository-level detection of ingress-nginx references in deployment manifests.
- CI gates that block new ingress-nginx usage and risky ingress annotations.
- Evidence bundles that document compliance and drift outcomes.

## Non-Goals

- Selecting or endorsing a specific controller vendor in Lane 1.
- Performing live cluster changes or migrations from this repository.

## Inputs

- Kubernetes manifests (`*.yaml`, `*.yml`) under infrastructure and deployment paths.
- Helm values and charts when present.
- Gateway API resources (`Gateway`, `HTTPRoute`, `TLSRoute`) for allowlist fixtures.

## Outputs

- Evidence bundles under `subsumption/ingress-nginx-retirement/runs/ci`.
- CI gate results for `ci/verify-subsump-bundle` and `ci/deny-ingress-nginx`.
- Deterministic fixtures for deny/allow scenarios.

## Controller-Neutral Migration Options

Summit remains controller neutral in Lane 1. Teams may select Gateway API-based controllers or
other supported ingress controllers based on their platform constraints. The governance bundle
only enforces retirement readiness and does not mandate a vendor selection.

## Required Gates

- `ci/verify-subsump-bundle`: verifies manifest, schemas, docs, and fixture presence.
- `ci/deny-ingress-nginx`: denies new ingress-nginx references or risky ingress annotations.

## Evidence Expectations

- Evidence IDs must be declared in the bundle manifest.
- `report.json` and `metrics.json` must be deterministic (no timestamps).
- `stamp.json` is the only artifact permitted to include timestamps.
- Existing ingress-nginx references are tracked as governed exceptions in
  `subsumption/ingress-nginx-retirement/allowlist.json` until migration work removes them.

## References

- https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
