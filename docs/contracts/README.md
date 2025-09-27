Contracts Starter Bundle

This folder documents the versioned seam between Maestro Conductor (MC) and CompanyOS (COS).

- Policy Pack: versioned, signed OPA bundle. Starter lives at `contracts/policy-pack/v0`.
- Evidence API: GraphQL mutation `publishEvidence(input: EvidenceInput!)` and REST stub `POST /v1/evidence`.
- Rollouts: Argo Rollouts canary with SLO+cost gates at `server/k8s/production/rollout.yaml`.
- AppSets: ArgoCD ApplicationSets for MC and COS in `deploy/argocd/`.

- The pack tar is available at `/v1/policy/packs/policy-pack-v0`.
- The Sigstore verification bundle is exposed at `/v1/policy/packs/policy-pack-v0/attestation`.
- For local DX, you may set `MC_DEV_AUTO_BUILD_PACK=true` and `MC_INLINE_BUNDLE=true`.
- Never enable `MC_DEV_AUTO_BUILD_PACK` in production; CI should be the only producer of artifacts.

Next steps
- Wire CI to package `contracts/policy-pack/v0` into a tarball and sign with cosign.
- Point COS to GET `/v1/policy/packs/policy-pack-v0` and verify signature.
- Emit Evidence via GraphQL and test gates in a canary rollout.

