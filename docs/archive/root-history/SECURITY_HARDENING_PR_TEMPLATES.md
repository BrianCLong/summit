# Pilot Security Hardening PR Pack (Stage-First)

**Risk score:** 58 · **Confidence:** High

This pack provides copy/paste-ready PR descriptions to land the pilot hardening
work predictably with small, reversible increments. Apply PR1 → PR2 → PR3 in
order. Start with `VERIFY_ENABLED=false` in production and `VERIFY_ENABLED=true`
in stage.

## Success Criteria and Checks

- Stage deploy is cryptographically gated while remaining reversible via
  variables.
- CI uses least privilege (OIDC assume-role; no static AWS keys in secrets).
- Required checks complete successfully: OIDC assume-role, SBOM upload, cosign
  sign/verify, policy tests block a known-bad change.

## PR1 — CI Least-Privilege + AWS OIDC (Stage Only)

**Suggested title:** `ci: least-privilege workflow permissions + AWS OIDC for stage deploy`

**Labels:** `security`, `ci`, `pilot`, `stage-only`

**Scope:** Minimize workflow permissions and replace static AWS credentials with
GitHub OIDC to assume a stage-only role.

**Toggles**

- `DEPLOY_ENABLED`: `true|false` — master kill switch for the deploy job.
- `OIDC_ENABLED`: `true|false` — if `false`, the deploy job exits early (no
  fallback to static keys).

**Definition of Done**

- Deploy workflow uses OIDC assume-role successfully in stage.
- No AWS access keys are required in GitHub secrets for deploy.
- Workflow permissions are explicit and minimal; `id-token: write` is only
  granted where OIDC is used.

**How to Test**

- Trigger the stage deploy workflow on a safe commit.
- Confirm logs show successful `AssumeRoleWithWebIdentity` and the stage role
  ARN used.
- Confirm the deploy completes while `DEPLOY_ENABLED=true` and `OIDC_ENABLED=true`.

**Rollback Plan**

- Flip `DEPLOY_ENABLED=false` if the deploy breaks.
- Revert the PR to restore the prior workflow (do not reintroduce static keys
  without break-glass approval).

**Reviewer Checklist**

- Workflow `permissions:` are minimal (contents read; `id-token` only where
  needed).
- Role ARN is stage-only and scoped (no wildcards or prod resources).
- No secrets are printed; no new long-lived credentials are added.

## PR2 — SBOM Generation + Keyless Cosign Signing (Advisory)

**Suggested title:** `build: generate SBOM + keyless cosign sign for pilot image (advisory)`

**Labels:** `security`, `supply-chain`, `pilot`

**Scope:** Produce SBOM and keyless cosign signatures for the pilot image to
prepare for verify-before-deploy enforcement.

**Toggles**

- `SIGN_ENABLED`: `true|false` — controls whether signing runs.
- `SBOM_ENABLED`: `true|false` — controls SBOM generation.

**Definition of Done**

- SBOM artifact (`sbom.cdx.json`) is generated for the built image digest and
  uploaded with hashes.
- `cosign sign` succeeds for the image digest when `SIGN_ENABLED=true`.
- No deploy enforcement yet (additive only).

**How to Test**

- Run the build workflow on the pilot branch.
- Verify the run uploads `sbom.cdx.json` and digest hashes.
- Confirm cosign reports successful signing of the image digest (keyless
  identity).

**Rollback Plan**

- Flip `SIGN_ENABLED=false` if signing is flaky.
- SBOM generation can remain even if signing is disabled.

**Reviewer Checklist**

- Signing is keyless (no private keys stored or uploaded).
- SBOM generation is tied to the immutable image digest, not mutable tags.
- Uploaded artifacts contain no secrets or PII.

## PR3 — Verify-Before-Deploy + OPA Gate (Stage Enforced, Prod Advisory)

**Suggested title:** `deploy: verify signed image before stage deploy + add OPA risk gate`

**Labels:** `security`, `policy`, `pilot`, `stage-enforced`

**Scope:** Enforce signature verification for stage deploys and introduce an OPA
policy gate that starts in warn-only mode.

**Toggles**

- `VERIFY_ENABLED_STAGE`: `true|false` — stage enforcement (default `true`).
- `VERIFY_ENABLED_PROD`: `true|false` — prod advisory (default `false`).
- `OPA_ENFORCE`: `true|false` — warn-only by default; flip to `true` after one
  sprint.
- `ALLOWLIST_PATH`: optional path to exception list (owner + expiry + ticket).

**Definition of Done**

- Stage deploy fails if `cosign verify` fails while `VERIFY_ENABLED_STAGE=true`.
- OPA policy tests pass and a known-bad change is blocked when
  `OPA_ENFORCE=true`.
- Verification uses image digests (immutable) and validates issuer/identity.

**How to Test**

1. Deploy path

- Ensure `VERIFY_ENABLED_STAGE=true` and attempt to deploy an unsigned image
  digest — deployment must fail.
- Deploy a signed digest — deployment must succeed.

2. Policy path

- Add a known-bad snippet (e.g., wildcard IAM action, privileged pod) in a test
  fixture and run policy tests.
- Confirm CI reports/block behavior according to `OPA_ENFORCE` mode.

**Rollback Plan**

- Set `VERIFY_ENABLED_STAGE=false` only if stage is blocked and urgent (log an
  incident and open a follow-up ticket).
- Keep OPA in warn-only mode with `OPA_ENFORCE=false`.

**Reviewer Checklist**

- Verify step uses digests (not tags) and checks issuer/identity regexes.
- OPA bundle includes unit tests; enforcement is behind a variable.
- Exceptions require owner + expiry (no permanent bypass); prod verify cannot be
  disabled via allowlist.

## Recommended Gate Rollout Order

1. Stage deploy gate ON: `VERIFY_ENABLED_STAGE=true`.
2. Build artifacts ON: `SBOM_ENABLED=true`, `SIGN_ENABLED=true`.
3. OPA gate WARN → ENFORCE: start warn-only for one sprint, then enable
   enforcement on the pilot repo.

## Minimal Known-Bad Policy Set (Week 1 Coverage)

- IAM: wildcard actions/resources.
- Kubernetes: privileged pods, hostPath, hostNetwork.
- Public exposure: public S3/bucket/ingress without auth.
- Hygiene: missing tags/labels for environment, team, and service ownership.

## Forward-Looking Enhancement

After stabilization, add an allowlist schema with owner + expiry + ticket and an
OPA rule enforcing expiring exceptions and disallowing prod verify overrides.
