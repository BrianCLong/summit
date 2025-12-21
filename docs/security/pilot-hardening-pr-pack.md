# Pilot Hardening PR Pack (Stage-First)

This playbook provides copy/paste-ready PR descriptions for a three-part hardening sequence: CI least privilege with OIDC, SBOM + signing, and verify-before-deploy with an OPA gate. Each PR includes enforcement toggles, rollback guidance, and objective pass/fail checks. Choose an enforcement mode up front:

- **Safe:** all gates run in advisory mode for one sprint; stage verify is non-blocking.
- **Standard (default):** stage verify blocks; prod verify is advisory until pilot stabilizes.
- **Aggressive:** stage + prod verify block immediately; exceptions require break-glass.

> **Rollback levers:** `DEPLOY_ENABLED`, `SIGN_ENABLED`, and `VERIFY_ENABLED` workflow variables provide one-line rollback without reverting code. For the policy gate, toggle `OPA_ENFORCE`.

## PR 1 — CI Least-Privilege + AWS OIDC (no static keys)

**What/Why**
- Remove broad default workflow permissions; grant only what each workflow needs.
- Enable GitHub Actions OIDC to assume an AWS role for deploy, eliminating static keys.

**Scope**
- `.github/workflows/ci.yml` (or main CI pipeline)
- `.github/workflows/deploy-stage.yml`

**Summary (paste into PR body)**
```
- Tighten workflow permissions to least privilege
- Enable AWS OIDC for stage deploy (no static secrets)
- Add deploy toggle via vars.DEPLOY_ENABLED
```

**Definition of Done**
- CI workflow declares explicit `permissions` with only `contents: read` and `actions: read`.
- Deploy workflow uses `id-token: write` and assumes the stage deploy role via `aws-actions/configure-aws-credentials@<PINNED_SHA>`.
- Deploy job is guarded by `if: ${{ vars.DEPLOY_ENABLED == 'true' }}`.

**Testing / Checks**
- ✅ Workflow permissions lint or `act` dry-run to confirm minimal permissions.
- ✅ `aws-actions/configure-aws-credentials` succeeds (assume-role output).
- ✅ No static AWS keys present in workflow secrets/steps.

**Rollback**
- Flip `DEPLOY_ENABLED=false` to halt deploy; revert workflow if deeper rollback is needed.

## PR 2 — SBOM + Cosign Signing (advisory by default)

**What/Why**
- Generate CycloneDX SBOMs for built images and publish as artifacts.
- Sign container images with keyless Cosign for provenance; keep enforcement optional initially.

**Scope**
- `.github/workflows/build.yml` (or equivalent build/publish workflow)
- `scripts/security/generate-sbom.sh`

**Summary (paste into PR body)**
```
- Add Syft-based SBOM generation for build artifacts
- Add keyless Cosign signing for built images
- Gate signing with vars.SIGN_ENABLED for rollback
```

**Definition of Done**
- `scripts/security/generate-sbom.sh` creates `security-artifacts/sbom.cdx.json` and `.sha256` for the image digest.
- Build workflow installs Syft (pinned SHA), generates SBOM, uploads as artifact.
- Cosign keyless signing step executes under `if: ${{ vars.SIGN_ENABLED == 'true' }}`.

**Testing / Checks**
- ✅ Build workflow run shows SBOM artifact uploaded.
- ✅ `cosign sign --yes <IMAGE_DIGEST>` succeeds (OIDC issuance visible in log).
- ✅ Hash file matches SBOM content (`sha256sum -c security-artifacts/sbom.cdx.json.sha256`).

**Rollback**
- Set `SIGN_ENABLED=false` to disable signing while keeping SBOM generation.

## PR 3 — Verify-Before-Deploy (stage enforced) + OPA Policy Gate

**What/Why**
- Verify image signatures before stage deploy; start prod in advisory mode.
- Add an OPA gate to block high-risk patterns (IAM wildcards, privileged pods) with tests.

**Scope**
- `.github/workflows/deploy-stage.yml`
- `policy/` bundle (e.g., `policy/export.rego`)
- `scripts/policy/test.sh`

**Summary (paste into PR body)**
```
- Verify container signatures in stage before deploy (Cosign keyless)
- Introduce OPA policy gate with deny list (IAM wildcards, privileged pods)
- Control enforcement via vars.VERIFY_ENABLED and vars.OPA_ENFORCE
```

**Definition of Done**
- Deploy workflow runs `cosign verify` when `VERIFY_ENABLED=true`, restricting issuer to `https://token.actions.githubusercontent.com` and identity to `https://github.com/.+`.
- OPA policy includes denies for IAM wildcard actions and privileged pods; tests cover both deny and allow paths.
- `scripts/policy/test.sh` executes `opa test` plus an evaluation check ensuring zero denies when expected.
- Stage enforcement: `VERIFY_ENABLED=true`; Prod advisory: `VERIFY_ENABLED=false` initially.

**Testing / Checks**
- ✅ `cosign verify` passes for signed stage image digest.
- ✅ `opa test policy -v` succeeds.
- ✅ Synthetic bad input (wildcard IAM or privileged pod) yields deny in CI when `OPA_ENFORCE=true`.

**Rollback**
- Flip `VERIFY_ENABLED=false` or `OPA_ENFORCE=false` to make gates advisory; revert workflow if full rollback is required.

## Reviewer Checklist (for all three PRs)
- [ ] Minimal workflow permissions declared; no implicit `write` scopes.
- [ ] OIDC assume-role uses pinned actions and correct role ARN/region.
- [ ] SBOM artifact present with matching SHA256; no secrets in logs.
- [ ] Cosign signing/verify steps are keyless and issuer/identity constrained.
- [ ] Policy tests cover deny/allow cases; enforcement toggles documented.
- [ ] Rollback toggles (`DEPLOY_ENABLED`, `SIGN_ENABLED`, `VERIFY_ENABLED`, `OPA_ENFORCE`) are present and defaulted appropriately.

## Post-Merge Validation Plan
- Trigger CI to confirm SBOM and signing steps run without secrets.
- Trigger stage deploy to confirm Cosign verify gate passes for signed images.
- Open a test PR introducing a known-bad pattern (wildcard IAM or privileged pod) to confirm OPA gate blocks when enforced.

## Forward-Looking Enhancement
- After pilot, add provenance verification via `cosign verify-attestation` with SLSA/Sigstore attestations and extend OPA inputs to consume IaC plan outputs (Terraform, Helm) for richer policy context.
