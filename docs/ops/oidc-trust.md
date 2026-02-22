# OIDC Trust & Rotation Guide

## Claims that must match
- `aud` (audience): provider-specific (AWS OIDC provider audience, GCP provider resource, Azure federated credential audience)
- `sub` (subject): must include repo and ref pattern (e.g., `repo:<owner>/<repo>:ref:refs/heads/main`)
- `repository` / `ref`: validated via token to identity introspection

## Thumbprint / JWKS rotation
- Track provider thumbprints/JWKS and set a quarterly rotation review
- Keep expected fingerprints in repo (non-secret) for drift checks

## Failure modes
- Mismatched `aud`/`sub` -> cannot assume role / exchange token
- Deleted or stale federated credential / provider -> 401/403 at deploy time

## Runbook (quick)
1. Re-establish provider (AWS/GCP/Azure) mapping for this repo/ref.
2. Re-issue federated credential / update thumbprints.
3. Re-run `parity-check` locally or via `workflow_dispatch`.
