# Admission Enforcement

## Overview
We use `policy-controller` to enforce supply chain security.
Namespace label: `policy.sigstore.dev/include=true`.

## Policies
- `summit-images-policy`: Requires valid signature + SBOM + Provenance for `ghcr.io/brianclong/summit*`.

## Rollout
1. Deploy Policy Controller.
2. Apply ClusterImagePolicy.
3. Label namespaces.
